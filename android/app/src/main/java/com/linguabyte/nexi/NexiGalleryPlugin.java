package com.linguabyte.nexi;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;

/**
 * Salva fotos/vídeos do NEXI na galeria (Pictures/NEXI e Movies/NEXI)
 * e abre o menu de compartilhamento do Android.
 */
@CapacitorPlugin(
    name = "NexiGallery",
    permissions = { @Permission(strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE }, alias = "storage") }
)
public class NexiGalleryPlugin extends Plugin {

    @PluginMethod
    public void save(PluginCall call) {
        // Android 10+ não precisa de permissão para gravar na própria pasta do app na galeria.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q && getPermissionState("storage") != PermissionState.GRANTED) {
            requestPermissionForAlias("storage", call, "storageResult");
            return;
        }
        doSave(call);
    }

    @PermissionCallback
    private void storageResult(PluginCall call) {
        if (getPermissionState("storage") == PermissionState.GRANTED) doSave(call);
        else call.reject("Permissão de armazenamento negada");
    }

    private void doSave(PluginCall call) {
        String data = call.getString("data");
        String mime = call.getString("mime", "image/jpeg");
        String name = call.getString("name", "nexi-" + System.currentTimeMillis());
        if (data == null) { call.reject("Nenhum dado recebido"); return; }
        boolean video = mime.startsWith("video/");
        String folder = video ? Environment.DIRECTORY_MOVIES : Environment.DIRECTORY_PICTURES;

        ContentResolver resolver = getContext().getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
        values.put(MediaStore.MediaColumns.MIME_TYPE, mime);
        Uri collection;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            values.put(MediaStore.MediaColumns.RELATIVE_PATH, folder + "/NEXI");
            values.put(MediaStore.MediaColumns.IS_PENDING, 1);
            collection = video
                ? MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
                : MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
        } else {
            File dir = new File(Environment.getExternalStoragePublicDirectory(folder), "NEXI");
            //noinspection ResultOfMethodCallIgnored
            dir.mkdirs();
            values.put(MediaStore.MediaColumns.DATA, new File(dir, name).getAbsolutePath());
            collection = video ? MediaStore.Video.Media.EXTERNAL_CONTENT_URI : MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
        }

        try {
            byte[] bytes = Base64.decode(data, Base64.DEFAULT);
            Uri uri = resolver.insert(collection, values);
            if (uri == null) throw new IOException("não foi possível criar o arquivo");
            try (OutputStream os = resolver.openOutputStream(uri)) {
                if (os == null) throw new IOException("não foi possível abrir o arquivo");
                os.write(bytes);
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.clear();
                values.put(MediaStore.MediaColumns.IS_PENDING, 0);
                resolver.update(uri, values, null, null);
            }
            JSObject ret = new JSObject();
            ret.put("uri", uri.toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Falha ao salvar: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void share(PluginCall call) {
        String data = call.getString("data");
        String mime = call.getString("mime", "image/jpeg");
        String name = call.getString("name", "nexi");
        if (data == null) { call.reject("Nenhum dado recebido"); return; }
        try {
            Context ctx = getContext();
            File dir = new File(ctx.getCacheDir(), "share");
            //noinspection ResultOfMethodCallIgnored
            dir.mkdirs();
            File file = new File(dir, name);
            try (FileOutputStream fos = new FileOutputStream(file)) {
                fos.write(Base64.decode(data, Base64.DEFAULT));
            }
            Uri uri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", file);
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType(mime);
            send.putExtra(Intent.EXTRA_STREAM, uri);
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent chooser = Intent.createChooser(send, "Compartilhar");
            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(chooser);
            call.resolve();
        } catch (Exception e) {
            call.reject("Falha ao compartilhar: " + e.getMessage(), e);
        }
    }
}
