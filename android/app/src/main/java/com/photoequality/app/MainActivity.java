package com.photoequality.app;

import android.Manifest;
import android.app.AlertDialog;
import android.content.ContentValues;
import android.content.DialogInterface;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import java.io.OutputStream;

public class MainActivity extends BridgeActivity {
    private static final int REQUEST_CODE_STORAGE_PERMISSION = 1001;
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
        
        // Request storage/media permission on app start so file picker opens naturally without click blocks
        checkAndRequestStoragePermission();
        
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

    private void checkAndRequestStoragePermission() {
        String permission;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permission = Manifest.permission.READ_MEDIA_IMAGES;
        } else {
            permission = Manifest.permission.READ_EXTERNAL_STORAGE;
        }

        if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{permission}, REQUEST_CODE_STORAGE_PERMISSION);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_CODE_STORAGE_PERMISSION) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // Permission granted successfully
            } else {
                // Denied ("Don't Allow") - gracefully do nothing, app will not crash
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            String currentUrl = getBridge().getWebView().getUrl();
            boolean isHome = true;
            if (currentUrl != null) {
                try {
                    Uri uri = Uri.parse(currentUrl);
                    String path = uri.getPath();
                    if (path != null && !path.equals("/") && !path.isEmpty()) {
                        isHome = false;
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

            if (isHome) {
                // Main/Home page -> "Confirm Exit" popup with Confirm Exit button
                new AlertDialog.Builder(this)
                    .setTitle("Confirm Exit")
                    .setMessage("Do you want to exit the app?")
                    .setPositiveButton("Confirm Exit", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            finishAffinity();
                        }
                    })
                    .setNegativeButton("Cancel", null)
                    .show();
            } else {
                // Other pages -> "Do you want to go back?" -> YES = previous page, NO = same page
                new AlertDialog.Builder(this)
                    .setTitle("Go Back")
                    .setMessage("Do you want to go back?")
                    .setPositiveButton("YES", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            getBridge().getWebView().evaluateJavascript("window.history.back()", null);
                        }
                    })
                    .setNegativeButton("NO", null)
                    .show();
            }
        } else {
            super.onBackPressed();
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
