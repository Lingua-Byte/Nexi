package com.linguabyte.nexi;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.URLUtil;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.File;

/**
 * Nexi: abre a página central (GitHub Pages) num WebView.
 * - Links do próprio site (web apps) abrem dentro do app.
 * - Links para .apk são baixados e o instalador do Android é aberto.
 * - Outros sites abrem no navegador.
 * - A página pode perguntar quais apps estão instalados via window.NexiAndroid.
 */
public class MainActivity extends Activity {

    static final String HOME = "https://lingua-byte.github.io/nexi/";
    static final String HOME_HOST = "lingua-byte.github.io";
    static final String APK_MIME = "application/vnd.android.package-archive";

    private WebView web;
    private DownloadManager downloads;
    private long pendingDownload = -1;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        downloads = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true); // localStorage: progresso dos apps web
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUserAgentString(s.getUserAgentString() + " NexiAndroid/" + appVersion());

        web.setWebViewClient(new Client());
        web.setDownloadListener((url, ua, disposition, mime, length) -> {
            if (APK_MIME.equals(mime) || isApk(Uri.parse(url))) {
                downloadApk(url, URLUtil.guessFileName(url, disposition, mime));
            } else {
                openExternal(Uri.parse(url));
            }
        });
        web.addJavascriptInterface(new Bridge(), "NexiAndroid");
        setContentView(web);

        IntentFilter done = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(onDownloadDone, done, Context.RECEIVER_EXPORTED);
        } else {
            registerReceiver(onDownloadDone, done);
        }

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
        } else {
            web.loadUrl(HOME);
        }
    }

    private String appVersion() {
        try {
            return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
        } catch (PackageManager.NameNotFoundException e) {
            return "?";
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Ao voltar do instalador, a página atualiza os botões (Abrir / Baixar).
        if (web != null) web.evaluateJavascript("window.onNexiResume && window.onNexiResume()", null);
    }

    @Override
    protected void onDestroy() {
        unregisterReceiver(onDownloadDone);
        web.destroy();
        super.onDestroy();
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    private static boolean isApk(Uri uri) {
        String path = uri.getPath();
        return path != null && path.toLowerCase().endsWith(".apk");
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (Exception e) {
            toast("Não há app para abrir este link.");
        }
    }

    private void downloadApk(String url, String fileName) {
        if (!getPackageManager().canRequestPackageInstalls()) {
            toast("Permita que o Nexi instale apps e toque em baixar de novo.");
            startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getPackageName())));
            return;
        }
        if (fileName == null || !fileName.toLowerCase().endsWith(".apk")) fileName = "app.apk";
        File old = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), fileName);
        if (old.exists()) old.delete();

        DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url))
                .setTitle(fileName)
                .setDescription("Baixando pelo Nexi")
                .setMimeType(APK_MIME)
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                .setDestinationInExternalFilesDir(this, Environment.DIRECTORY_DOWNLOADS, fileName);
        pendingDownload = downloads.enqueue(req);
        toast("Baixando " + fileName + "…");
    }

    private final BroadcastReceiver onDownloadDone = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
            if (id != pendingDownload) return;
            pendingDownload = -1;
            Uri file = downloads.getUriForDownloadedFile(id);
            if (file == null) {
                toast("O download falhou.");
                return;
            }
            Intent install = new Intent(Intent.ACTION_VIEW)
                    .setDataAndType(file, APK_MIME)
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                startActivity(install);
            } catch (Exception e) {
                toast("Não consegui abrir o instalador.");
            }
        }
    };

    private void toast(String msg) {
        runOnUiThread(() -> Toast.makeText(this, msg, Toast.LENGTH_LONG).show());
    }

    private class Client extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            String scheme = uri.getScheme();
            if (isApk(uri)) {
                downloadApk(uri.toString(), uri.getLastPathSegment());
                return true;
            }
            if (("https".equals(scheme) || "http".equals(scheme)) && HOME_HOST.equals(uri.getHost())) {
                return false; // páginas do Nexi abrem dentro do app
            }
            openExternal(uri);
            return true;
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) view.loadUrl("file:///android_asset/offline.html");
        }
    }

    /** Disponível na página como window.NexiAndroid. */
    private class Bridge {
        @JavascriptInterface
        public String version() {
            return appVersion();
        }

        /** Versão instalada do app, ou "" se não estiver instalado. */
        @JavascriptInterface
        public String installedVersion(String pkg) {
            try {
                PackageInfo info = getPackageManager().getPackageInfo(pkg, 0);
                return info.versionName == null ? "instalado" : info.versionName;
            } catch (PackageManager.NameNotFoundException e) {
                return "";
            }
        }

        @JavascriptInterface
        public boolean openApp(String pkg) {
            Intent launch = getPackageManager().getLaunchIntentForPackage(pkg);
            if (launch == null) return false;
            startActivity(launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            return true;
        }

        @JavascriptInterface
        public void download(String url) {
            Uri uri = Uri.parse(url);
            runOnUiThread(() -> downloadApk(url, uri.getLastPathSegment()));
        }
    }
}
