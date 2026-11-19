package ru.armi.app;

import java.io.ByteArrayOutputStream;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;

/**
 * Локальный HTTP-сервер на 127.0.0.1:8377.
 * Отдаёт index.html, чтобы WebView работал с secure context
 * (crypto.subtle для закрытой зоны) и постоянным localStorage.
 * Наружу никаких соединений — только loopback.
 */
public class LocalServer implements Runnable {

    /** Источник тела index.html. */
    public interface Source {
        byte[] indexHtml() throws Exception;

        /** Ресурс рядом с index.html (сейчас только vendor-webllm.js); null — нет такого. */
        default byte[] asset(String name) throws Exception { return null; }
    }

    public static final int PORT = 8377;

    private final Source source;
    private ServerSocket serverSocket;
    private volatile boolean serving = false;

    public LocalServer(Source source) {
        this.source = source;
    }

    /** Поднять сервер; true — если получилось. */
    public boolean start() {
        try {
            serverSocket = new ServerSocket(PORT, 16, InetAddress.getByName("127.0.0.1"));
            serving = true;
            Thread t = new Thread(this);
            t.setDaemon(true);
            t.start();
            return true;
        } catch (Exception e) {
            serving = false;
            return false;
        }
    }

    public void stop() {
        serving = false;
        try {
            if (serverSocket != null) serverSocket.close();
        } catch (Exception ignored) {
        }
    }

    public void run() {
        while (serving) {
            try {
                handle(serverSocket.accept());
            } catch (Exception e) {
                break;
            }
        }
    }

    private void handle(Socket sock) {
        try {
            BufferedReader in = new BufferedReader(
                    new InputStreamReader(sock.getInputStream(), "ISO-8859-1"));
            String req = in.readLine();
            String line;
            while ((line = in.readLine()) != null && line.length() > 0) { /* заголовки */ }

            OutputStream out = sock.getOutputStream();
            if (req == null || !req.startsWith("GET ")) {
                write(out, 400, bytes("Bad Request"), "text/plain");
            } else {
                String path = req.substring(4).split(" ")[0];
                if (path.equals("/") || path.equals("/index.html") || path.startsWith("/?")) {
                    write(out, 200, source.indexHtml(), "text/html; charset=utf-8");
                } else if (path.equals("/vendor-webllm.js")) {
                    /* локальный движок ИИ лежит в APK: без него приложению пришлось бы грузить его с CDN */
                    byte[] js = source.asset("vendor-webllm.js");
                    if (js != null) write(out, 200, js, "text/javascript; charset=utf-8");
                    else write(out, 404, bytes("Not Found"), "text/plain");
                } else {
                    write(out, 404, bytes("Not Found"), "text/plain");
                }
            }
            sock.close();
        } catch (Exception ignored) {
        }
    }

    private static byte[] bytes(String s) {
        try {
            return s.getBytes("ISO-8859-1");
        } catch (Exception e) {
            return new byte[0];
        }
    }

    private static void write(OutputStream out, int code, byte[] body, String type) throws Exception {
        String reason;
        if (code == 200) reason = "OK";
        else if (code == 404) reason = "Not Found";
        else reason = "Bad Request";
        String head = "HTTP/1.1 " + code + " " + reason
                + "\r\nContent-Type: " + type
                + "\r\nContent-Length: " + body.length
                + "\r\nCache-Control: no-store"
                + "\r\nConnection: close\r\n\r\n";
        out.write(head.getBytes("ISO-8859-1"));
        out.write(body);
        out.flush();
    }
}
