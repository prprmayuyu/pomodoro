package com.gina.pomodoro;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class AlarmReceiver extends BroadcastReceiver {
    private static final String CHANNEL_TIMER = "pomodoro_timer";
    private static final String CHANNEL_DAILY = "daily_reminders";

    @Override
    public void onReceive(Context context, Intent intent) {
        String type = intent.getStringExtra("type");
        if (type == null) return;
        createChannels(context);

        if ("daily".equals(type)) {
            String id = intent.getStringExtra("id");
            int hour = intent.getIntExtra("hour", 9);
            int minute = intent.getIntExtra("minute", 0);
            String message = intent.getStringExtra("message");
            showNotification(context, CHANNEL_DAILY, 1000 + Math.abs((id == null ? "daily" : id).hashCode() % 100000),
                    "一粒番茄茄", message == null ? "该开始工作了" : message);
            ReminderScheduler.scheduleDailyReminder(context, id == null ? "default_work" : id, hour, minute,
                    message == null ? "该开始工作了" : message, false);
            return;
        }

        if ("break_start".equals(type)) {
            showNotification(context, CHANNEL_TIMER, 2001,
                    "休息时间开始了", "专注结束，休息 5 分钟吧。");
            return;
        }

        if ("break_end".equals(type)) {
            showNotification(context, CHANNEL_TIMER, 2002,
                    "休息时间结束了", "可以开始下一轮专注了。");
            ReminderScheduler.clearTimerPersistence(context);
        }
    }

    private static void createChannels(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm == null) return;

        NotificationChannel timer = new NotificationChannel(
                CHANNEL_TIMER, "一粒番茄茄 · 计时", NotificationManager.IMPORTANCE_HIGH);
        timer.setDescription("专注结束和休息结束提醒");
        timer.enableVibration(true);

        NotificationChannel daily = new NotificationChannel(
                CHANNEL_DAILY, "一粒番茄茄 · 每日提醒", NotificationManager.IMPORTANCE_DEFAULT);
        daily.setDescription("自定义工作提醒");
        daily.enableVibration(true);

        nm.createNotificationChannel(timer);
        nm.createNotificationChannel(daily);
    }

    private static void showNotification(Context context, String channelId, int id, String title, String text) {
        Intent openIntent = new Intent(context, MainActivity.class);
        openIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
                context, id, openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

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
            builder.setPriority(android.app.Notification.PRIORITY_HIGH)
                    .setDefaults(android.app.Notification.DEFAULT_ALL);
        }

        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(id, builder.build());
    }
}
