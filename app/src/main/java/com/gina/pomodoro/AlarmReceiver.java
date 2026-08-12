package com.gina.pomodoro;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String type = intent.getStringExtra("type");
        if (type == null) return;

        if ("daily".equals(type)) {
            String id = intent.getStringExtra("id");
            int hour = intent.getIntExtra("hour", 9);
            int minute = intent.getIntExtra("minute", 0);
            String message = intent.getStringExtra("message");
            showNotification(context,
                    1000 + Math.abs((id == null ? "daily" : id).hashCode() % 100000),
                    "一粒番茄茄",
                    message == null ? "该开始工作了" : message);
            ReminderScheduler.scheduleDailyReminder(context,
                    id == null ? "default_work" : id,
                    hour,
                    minute,
                    message == null ? "该开始工作了" : message,
                    false);
            return;
        }

        if ("lifestyle".equals(type)) {
            String id = intent.getStringExtra("id");
            String title = intent.getStringExtra("title");
            String message = intent.getStringExtra("message");
            showNotification(context,
                    3000 + Math.abs((id == null ? "lifestyle" : id).hashCode() % 100000),
                    title == null || title.trim().isEmpty() ? "提醒" : title,
                    message == null || message.trim().isEmpty() ? "该休息一下了。" : message);
            ReminderScheduler.onLifestyleReminderFired(context, id);
            return;
        }

        if ("test_alarm".equals(type)) {
            showNotification(context, 39001, "测试提醒", "10 秒定时提醒正常到达。🍅");
            return;
        }

        if ("break_start".equals(type)) {
            showNotification(context, 2001,
                    "休息时间开始了", "专注结束，休息 5 分钟吧。");
            return;
        }

        if ("break_end".equals(type)) {
            showNotification(context, 2002,
                    "休息时间结束了", "可以开始下一轮专注了。");
            ReminderScheduler.clearTimerPersistence(context);
        }
    }

    static void sendTestNotification(Context context) {
        showNotification(context, 39000, "测试通知", "如果你看到、听到或感觉到它，通知通道正常。🍅");
    }

    private static String ensureChannel(Context context) {
        String channelId = AlertPreferences.channelId(context);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return channelId;

        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm == null) return channelId;

        NotificationChannel existing = nm.getNotificationChannel(channelId);
        if (existing != null) return channelId;

        boolean sound = AlertPreferences.isSoundEnabled(context);
        boolean vibration = AlertPreferences.isVibrationEnabled(context);
        int importance = (sound || vibration)
                ? NotificationManager.IMPORTANCE_HIGH
                : NotificationManager.IMPORTANCE_DEFAULT;

        NotificationChannel channel = new NotificationChannel(
                channelId,
                AlertPreferences.channelName(context),
                importance
        );
        channel.setDescription("番茄钟结束、喝水、活动、运动和自定义提醒");

        if (sound) {
            Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            AudioAttributes attributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
            channel.setSound(soundUri, attributes);
        } else {
            channel.setSound(null, null);
        }

        if (vibration) {
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 180, 100, 220});
        } else {
            channel.enableVibration(false);
        }

        nm.createNotificationChannel(channel);
        return channelId;
    }

    private static void showNotification(Context context, int id, String title, String text) {
        Intent openIntent = new Intent(context, MainActivity.class);
        openIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
                context,
                id,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        boolean sound = AlertPreferences.isSoundEnabled(context);
        boolean vibration = AlertPreferences.isVibrationEnabled(context);
        String channelId = ensureChannel(context);

        android.app.Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new android.app.Notification.Builder(context, channelId)
                : new android.app.Notification.Builder(context);

        builder.setSmallIcon(com.gina.pomodoro.R.drawable.ic_timer)
                .setContentTitle(title)
                .setContentText(text)
                .setAutoCancel(true)
                .setContentIntent(contentIntent)
                .setCategory(android.app.Notification.CATEGORY_REMINDER)
                .setVisibility(android.app.Notification.VISIBILITY_PRIVATE);

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            builder.setPriority(android.app.Notification.PRIORITY_HIGH);
            if (sound) {
                builder.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION));
            }
            if (vibration) {
                builder.setVibrate(new long[]{0, 180, 100, 220});
            }
        }

        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(id, builder.build());
    }
}
