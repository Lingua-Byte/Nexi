package com.linguabyte.nexi;

import android.os.Bundle;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NexiGalleryPlugin.class);
        super.onCreate(savedInstanceState);
        // Mantém a tela ligada enquanto a câmera está aberta.
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
}
