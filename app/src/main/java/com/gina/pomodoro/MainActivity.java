package com.gina.pomodoro;

import android.Manifest;
import android.app.Activity;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ShortcutInfo;
import android.content.pm.ShortcutManager;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.graphics.drawable.Icon;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView webView;
    private static final int NOTIFICATION_PERMISSION_REQUEST = 1101;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureSystemBars();
        configureWebView();
        requestNotificationPermissionIfNeeded();
    }

    private void configureSystemBars() {
        Window window = getWindow();
        window.setStatusBarColor(0xFFFFFFFF);
        window.setNavigationBarColor(0xFFFFFFFF);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            window.getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
            );
        }
    }

    private void configureWebView() {
        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setTextZoom(100);
        settings.setSupportZoom(false);
        settings.setMediaPlaybackRequiresUserGesture(true);

        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                view.evaluateJavascript(
                        "(function(){" +
                                "function add(src,id,next){if(document.getElementById(id)){if(next)next();return;}" +
                                "var s=document.createElement('script');s.id=id;s.src=src;if(next)s.onload=next;document.body.appendChild(s);}" +
                                "add('v2_patch.js','v2Patch',function(){" +
                                "add('v3_patch.js','v3Patch',function(){" +
                                "add('v3_ui_fix.js','v3UiFix',function(){add('v4_patch.js','v4Patch');});" +
                                "});" +
                                "});" +
                                "})();",
                        null
                );
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        webView.addJavascriptInterface(new AndroidBridge(), "Android");
        webView.loadUrl("file:///android_asset/index.html");
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_REQUEST);
        }
    }

    private boolean hasNotificationPermission() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
                || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    private Bitmap buildShortcutBitmap(String glyph, String theme) {
        final int size = 432;
        Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        int background;
        int foreground;
        if ("sweet".equals(theme)) {
            background = Color.rgb(255, 240, 245);
            foreground = Color.rgb(201, 135, 168);
        } else if ("forest".equals(theme)) {
            background = Color.rgb(240, 243, 235);
            foreground = Color.rgb(58, 90, 64);
        } else {
            background = Color.WHITE;
            foreground = Color.rgb(17, 17, 17);
        }
        canvas.drawColor(background);

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.SUBPIXEL_TEXT_FLAG);
        paint.setColor(foreground);
        paint.setTextAlign(Paint.Align.CENTER);
        paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.NORMAL));

        float textSize = 225f;
        paint.setTextSize(textSize);
        final float maxWidth = 282f;
        while (paint.measureText(glyph) > maxWidth && textSize > 72f) {
            textSize -= 8f;
            paint.setTextSize(textSize);
        }
        Paint.FontMetrics fm = paint.getFontMetrics();
        float y = size / 2f - (fm.ascent + fm.descent) / 2f;
        canvas.drawText(glyph, size / 2f, y, paint);
        return bitmap;
    }

    private void scheduleTestReminderInternal(int seconds) {
        int delay = Math.max(5, Math.min(60, seconds));
        long trigger = System.currentTimeMillis() + delay * 1000L;
        Intent intent = new Intent(this, AlarmReceiver.class);
        intent.setAction("com.gina.pomodoro.TEST_REMINDER");
        intent.putExtra("type", "test_alarm");
        PendingIntent pi = PendingIntent.getBroadcast(
                this,
                99001,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        AlarmManager am = (AlarmManager) getSystemService(ALARM_SERVICE);
        if (am == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pi);
        } else {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pi);
        }
    }

    private final class AndroidBridge {
        @JavascriptInterface
        public void schedulePomodoro(long focusEndMs, long breakEndMs) {
            ReminderScheduler.schedulePomodoro(MainActivity.this, focusEndMs, breakEndMs);
        }

        @JavascriptInterface
        public void cancelPomodoro() {
            ReminderScheduler.cancelPomodoro(MainActivity.this, true);
        }

        @JavascriptInterface
        public void scheduleDailyReminder(String id, int hour, int minute, String message) {
            ReminderScheduler.scheduleDailyReminder(MainActivity.this, id, hour, minute, message, true);
        }

        @JavascriptInterface
        public void cancelDailyReminder(String id) {
            ReminderScheduler.cancelDailyReminder(MainActivity.this, id, true);
        }

        @JavascriptInterface
        public void scheduleLifestyleReminder(String json) {
            ReminderScheduler.scheduleLifestyleReminder(MainActivity.this, json, true);
        }

        @JavascriptInterface
        public void cancelLifestyleReminder(String id) {
            ReminderScheduler.cancelLifestyleReminder(MainActivity.this, id, true);
        }

        @JavascriptInterface
        public boolean canScheduleExactAlarms() {
            return ReminderScheduler.canScheduleExactAlarms(MainActivity.this);
        }

        @JavascriptInterface
        public boolean hasNotificationPermission() {
            return MainActivity.this.hasNotificationPermission();
        }

        @JavascriptInterface
        public void requestNotificationPermission() {
            runOnUiThread(MainActivity.this::requestNotificationPermissionIfNeeded);
        }

        @JavascriptInterface
        public void openNotificationSettings() {
            runOnUiThread(() -> {
                Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                        .putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName());
                startActivity(intent);
            });
        }

        @JavascriptInterface
        public void requestExactAlarmAccess() {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return;
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                            Uri.parse("package:" + getPackageName()));
                    startActivity(intent);
                } catch (Exception e) {
                    Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                            Uri.parse("package:" + getPackageName()));
                    startActivity(intent);
                }
            });
        }

        @JavascriptInterface
        public boolean isReminderSoundEnabled() {
            return AlertPreferences.isSoundEnabled(MainActivity.this);
        }

        @JavascriptInterface
        public void setReminderSoundEnabled(boolean enabled) {
            AlertPreferences.setSoundEnabled(MainActivity.this, enabled);
        }

        @JavascriptInterface
        public boolean isReminderVibrationEnabled() {
            return AlertPreferences.isVibrationEnabled(MainActivity.this);
        }

        @JavascriptInterface
        public void setReminderVibrationEnabled(boolean enabled) {
            AlertPreferences.setVibrationEnabled(MainActivity.this, enabled);
        }

        @JavascriptInterface
        public void sendTestNotification() {
            runOnUiThread(() -> AlarmReceiver.sendTestNotification(MainActivity.this));
        }

        @JavascriptInterface
        public void scheduleTestReminder(int seconds) {
            scheduleTestReminderInternal(seconds);
        }

        @JavascriptInterface
        public void setKeepScreenOn(boolean keepOn) {
            runOnUiThread(() -> {
                if (keepOn) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            });
        }

        @JavascriptInterface
        public void setTheme(String theme) {
            runOnUiThread(() -> {
                int bg;
                int flags = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                if ("sweet".equals(theme)) bg = 0xFFFFF9FB;
                else if ("forest".equals(theme)) bg = 0xFFFAFBF7;
                else bg = 0xFFFFFFFF;
                getWindow().setStatusBarColor(bg);
                getWindow().setNavigationBarColor(bg);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    getWindow().getDecorView().setSystemUiVisibility(flags);
                }
            });
        }

        @JavascriptInterface
        public boolean canPinCustomShortcut() {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false;
            ShortcutManager manager = getSystemService(ShortcutManager.class);
            return manager != null && manager.isRequestPinShortcutSupported();
        }

        @JavascriptInterface
        public void pinCustomShortcut(String glyph, String theme) {
            final String value = glyph == null ? "" : glyph.trim();
            if (value.isEmpty() || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
            runOnUiThread(() -> {
                ShortcutManager manager = getSystemService(ShortcutManager.class);
                if (manager == null || !manager.isRequestPinShortcutSupported()) return;

                Bitmap bitmap = buildShortcutBitmap(value, theme);
                Intent open = new Intent(MainActivity.this, MainActivity.class)
                        .setAction(Intent.ACTION_VIEW)
                        .putExtra("custom_shortcut", true);
                ShortcutInfo shortcut = new ShortcutInfo.Builder(
                        MainActivity.this,
                        "custom_icon_" + System.currentTimeMillis())
                        .setShortLabel("一粒番茄茄")
                        .setLongLabel("一粒番茄茄")
                        .setIcon(Icon.createWithAdaptiveBitmap(bitmap))
                        .setIntent(open)
                        .build();
                manager.requestPinShortcut(shortcut, null);
            });
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        ReminderScheduler.rescheduleAll(this);
        if (webView != null) {
            webView.evaluateJavascript("window.onNativeResume && window.onNativeResume();", null);
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.removeJavascriptInterface("Android");
            webView.destroy();
        }
        super.onDestroy();
    }
}
