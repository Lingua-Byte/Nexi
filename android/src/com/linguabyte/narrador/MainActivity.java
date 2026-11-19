package com.linguabyte.narrador;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Locale;
import java.util.Set;

/**
 * Narrador: hospeda a página do narrador num WebView e expõe o motor
 * TextToSpeech nativo do Android para o JavaScript (o WebView não tem
 * window.speechSynthesis). A página usa a ponte "AndroidTTS".
 */
public class MainActivity extends Activity implements TextToSpeech.OnInitListener {
    private static final int FILE_REQ = 41;
    private WebView web;
    private TextToSpeech tts;
    private volatile boolean ready = false;
    private ValueCallback<Uri[]> fileCallback;
    private String sharedText;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.parseColor("#14121c"));
        getWindow().setNavigationBarColor(Color.parseColor("#14121c"));

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#14121c"));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);

        web.addJavascriptInterface(new Bridge(), "AndroidTTS");
        web.setWebViewClient(new WebViewClient() {
            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView v, String url) {
                Uri u = Uri.parse(url);
                if ("file".equals(u.getScheme())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (ActivityNotFoundException e) { }
                return true;
            }

            @Override
            public void onPageFinished(WebView v, String url) {
                if (ready) js("window.__ttsReady&&window.__ttsReady()");
                deliverShared();
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = cb;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("text/*");
                try {
                    startActivityForResult(Intent.createChooser(i, "Abrir texto"), FILE_REQ);
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });
        setContentView(web);

        handleIntent(getIntent());
        tts = new TextToSpeech(this, this);
        web.loadUrl("file:///android_asset/index.html");
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
        deliverShared();
    }

    private void handleIntent(Intent i) {
        if (i != null && Intent.ACTION_SEND.equals(i.getAction())) {
            sharedText = i.getStringExtra(Intent.EXTRA_TEXT);
        }
    }

    private void deliverShared() {
        if (sharedText == null || web == null) return;
        String t = JSONObject.quote(sharedText);
        sharedText = null;
        js("window.__sharedText&&window.__sharedText(" + t + ")");
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == FILE_REQ && fileCallback != null) {
            Uri[] r = null;
            if (res == RESULT_OK && data != null && data.getData() != null) r = new Uri[]{data.getData()};
            fileCallback.onReceiveValue(r);
            fileCallback = null;
            return;
        }
        super.onActivityResult(req, res, data);
    }

    @Override
    public void onInit(int status) {
        if (status != TextToSpeech.SUCCESS) {
            js("window.__ttsFail&&window.__ttsFail()");
            return;
        }
        tts.setLanguage(new Locale("pt", "BR"));
        tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override public void onStart(String id) { event(id, "start"); }
            @Override public void onDone(String id) { event(id, "end"); }
            @Override public void onError(String id) { event(id, "error"); }
            @Override public void onError(String id, int code) { event(id, "error"); }
            @Override public void onStop(String id, boolean interrupted) { event(id, "stop"); }
        });
        ready = true;
        js("window.__ttsReady&&window.__ttsReady()");
    }

    private void event(String id, String ev) {
        js("window.__ttsEvent&&window.__ttsEvent(" + JSONObject.quote(id) + ",'" + ev + "')");
    }

    private void js(final String code) {
        if (web == null) return;
        web.post(new Runnable() {
            @Override public void run() { if (web != null) web.evaluateJavascript(code, null); }
        });
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (tts != null) { tts.stop(); tts.shutdown(); }
        if (web != null) { web.destroy(); web = null; }
        super.onDestroy();
    }

    /** Ponte JavaScript ↔ TextToSpeech. */
    private class Bridge {
        @JavascriptInterface
        public boolean isReady() { return ready; }

        @JavascriptInterface
        public String voices() {
            JSONArray arr = new JSONArray();
            if (!ready) return arr.toString();
            try {
                Set<Voice> vs = tts.getVoices();
                if (vs == null) return arr.toString();
                for (Voice v : vs) {
                    Set<String> f = v.getFeatures();
                    if (f != null && f.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)) continue;
                    JSONObject o = new JSONObject();
                    o.put("name", v.getName());
                    o.put("lang", v.getLocale().toLanguageTag());
                    o.put("network", v.isNetworkConnectionRequired());
                    o.put("quality", v.getQuality());
                    arr.put(o);
                }
            } catch (Exception e) { }
            return arr.toString();
        }

        @JavascriptInterface
        public void speak(String id, String text, float rate, float pitch, String voiceName, String lang) {
            if (!ready) { event(id, "error"); return; }
            Voice chosen = null;
            if (voiceName != null && voiceName.length() > 0) {
                Set<Voice> vs = tts.getVoices();
                if (vs != null) for (Voice v : vs) if (v.getName().equals(voiceName)) { chosen = v; break; }
            }
            if (chosen != null) tts.setVoice(chosen);
            else if (lang != null && lang.length() > 0) tts.setLanguage(Locale.forLanguageTag(lang));
            tts.setSpeechRate(rate);
            tts.setPitch(pitch);
            Bundle b = new Bundle();
            b.putString(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, id);
            int r = tts.speak(text, TextToSpeech.QUEUE_ADD, b, id);
            if (r != TextToSpeech.SUCCESS) event(id, "error");
        }

        @JavascriptInterface
        public void stop() { if (ready) tts.stop(); }

        @JavascriptInterface
        public boolean speaking() { return ready && tts.isSpeaking(); }

        @JavascriptInterface
        public void openTtsSettings() {
            try {
                Intent i = new Intent("com.android.settings.TTS_SETTINGS");
                i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(i);
            } catch (Exception e) {
                try {
                    Intent i = new Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA);
                    i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(i);
                } catch (Exception ignored) { }
            }
        }
    }
}
