package com.photoequality.app;

import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;
import java.io.OutputStream;

public class MainActivity extends BridgeActivity {
    private final Handler handler = new Handler();
    private final Runnable injectorRunnable = new Runnable() {
        @Override
        public void run() {
            try {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    String js = "(function() {\n" +
                            "    if (window.HasInjectedDownloadInterceptor) return;\n" +
                            "    window.HasInjectedDownloadInterceptor = true;\n" +
                            "    var oldClick = HTMLAnchorElement.prototype.click;\n" +
                            "    HTMLAnchorElement.prototype.click = function() {\n" +
                            "        if (this.href && (this.href.startsWith('blob:') || this.href.startsWith('data:'))) {\n" +
                            "            var fileName = this.download || 'edited-image.png';\n" +
                            "            var href = this.href;\n" +
                            "            if (href.startsWith('data:')) {\n" +
                            "                if (window.AndroidDownloadBridge) {\n" +
                            "                    window.AndroidDownloadBridge.saveBase64ImageToDownloads(href.split(',')[1], fileName);\n" +
                            "                }\n" +
                            "            } else if (href.startsWith('blob:')) {\n" +
                            "                fetch(href)\n" +
                            "                    .then(function(r) { return r.blob(); })\n" +
                            "                    .then(function(b) {\n" +
                            "                        var reader = new FileReader();\n" +
                            "                        reader.onloadend = function() {\n" +
                            "                            var base64 = reader.result.split(',')[1];\n" +
                            "                            if (window.AndroidDownloadBridge) {\n" +
                            "                                window.AndroidDownloadBridge.saveBase64ImageToDownloads(base64, fileName);\n" +
                            "                            }\n" +
                            "                        };\n" +
                            "                        reader.readAsDataURL(b);\n" +
                            "                    }).catch(function(e) { console.error(e); });\n" +
                            "            }\n" +
                            "            return;\n" +
                            "        }\n" +
                            "        oldClick.apply(this, arguments);\n" +
                            "    };\n" +
                            "})();";
                    getBridge().getWebView().evaluateJavascript(js, null);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
            handler.postDelayed(this, 1000);
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        try {
            getBridge().getWebView().getSettings().setJavaScriptEnabled(true);
            getBridge().getWebView().addJavascriptInterface(new Object() {
                    @JavascriptInterface
                    public boolean saveBase64ImageToDownloads(String base64Data, String fileName) {
                        try {
                            if (base64Data == null || fileName == null) return false;
                            
                            byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
                            if (bytes == null || bytes.length == 0) return false;

                            ContentValues values = new ContentValues();
                            values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                            values.put(MediaStore.MediaColumns.MIME_TYPE, "image/png");

                            Uri contentUri;
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                contentUri = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
                                values.put(MediaStore.MediaColumns.RELATIVE_PATH, "Download/");
                                values.put(MediaStore.MediaColumns.IS_PENDING, 1);
                            } else {
                                contentUri = MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
                            }

                            Uri uri = getContentResolver().insert(contentUri, values);
                            if (uri == null) return false;

                            boolean writeSuccessful = false;
                            try (OutputStream os = getContentResolver().openOutputStream(uri)) {
                                if (os != null) {
                                    os.write(bytes);
                                    os.flush();
                                    writeSuccessful = true;
                                }
                            }

                            if (writeSuccessful) {
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                    ContentValues updateValues = new ContentValues();
                                    updateValues.put(MediaStore.MediaColumns.IS_PENDING, 0);
                                    getContentResolver().update(uri, updateValues, null, null);
                                }
                                return true;
                            } else {
                                getContentResolver().delete(uri, null, null);
                            }
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                        return false;
                    }
                }, "AndroidDownloadBridge");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        handler.postDelayed(injectorRunnable, 1000);
    }

    @Override
    public void onPause() {
        super.onPause();
        handler.removeCallbacks(injectorRunnable);
    }
}
