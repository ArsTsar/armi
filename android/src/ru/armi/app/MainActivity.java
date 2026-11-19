package ru.armi.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/**
 * Арми — локальный ассистент (одна активность, полностью офлайн).
 * HTML-приложение лежит в assets/index.html.
 */
public class MainActivity extends Activity implements LocalServer.Source {

    private WebView web;
    private LocalServer server;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // локальный сервер поднимается ДО загрузки страницы
        server = new LocalServer(this);
        boolean ok = server.start();

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        web.setWebViewClient(new WebViewClient());
        web.setBackgroundColor(Color.parseColor("#0B0D11"));
        setContentView(web);

        if (ok) {
            web.loadUrl("http://127.0.0.1:" + LocalServer.PORT + "/");
        } else {
            // запасной путь, если порт вдруг занят
            web.loadUrl("file:///android_asset/index.html");
        }
    }

    /** Тело index.html для локального сервера. */
    public byte[] indexHtml() throws Exception {
        return readAsset("index.html");
    }

    /** Отдаём только vendor-webllm.js — остальные ассеты наружу не выходят. */
    @Override
    public byte[] asset(String name) throws Exception {
        if (!"vendor-webllm.js".equals(name)) return null;
        try { return readAsset(name); } catch (java.io.IOException e) { return null; }
    }

    private byte[] readAsset(String name) throws Exception {
        InputStream is = getAssets().open(name);
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        byte[] buf = new byte[65536];
        int n;
        while ((n = is.read(buf)) > 0) bo.write(buf, 0, n);
        is.close();
        return bo.toByteArray();
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (server != null) server.stop();
    }
}
