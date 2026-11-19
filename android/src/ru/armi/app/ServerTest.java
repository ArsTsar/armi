package ru.armi.app;

import java.io.FileInputStream;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;

/** Настольный тест LocalServer: тот же класс, источник — файл с диска. */
public class ServerTest {
    public static class FileSource implements LocalServer.Source {
        private final String path;
        public FileSource(String path) { this.path = path; }
        public byte[] indexHtml() throws Exception {
            InputStream is = new FileInputStream(path);
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            byte[] buf = new byte[65536];
            int n;
            while ((n = is.read(buf)) > 0) bo.write(buf, 0, n);
            is.close();
            return bo.toByteArray();
        }
    }

    public static void main(String[] args) throws Exception {
        String html = args.length > 0 ? args[0] : "assets/index.html";
        LocalServer s = new LocalServer(new FileSource(html));
        if (!s.start()) { System.out.println("FAIL: сервер не поднялся"); System.exit(1); }
        System.out.println("Сервер запущен на 127.0.0.1:" + LocalServer.PORT);
        Thread.sleep(60_000); // живём минуту для проверок curl
        s.stop();
    }
}
