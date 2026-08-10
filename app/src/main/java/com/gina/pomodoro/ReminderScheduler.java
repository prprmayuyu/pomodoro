package com.gina.pomodoro;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONObject;

import java.util.Calendar;
import java.util.Map;

public final class ReminderScheduler {
    private static final String PREFS = "pomodoro_native";
    private static final String REMINDER_PREFIX = "reminder_";
    private static final String TIMER_FOCUS_END = "timer_focus_end";
    private static final String TIMER_BREAK_END = "timer_break_end";

    private ReminderScheduler() {}

    static void scheduleDailyReminder(Context context, String id, int hour, int minute, String message, boolean persist) {
        if (id == null || id.trim().isEmpty()) return;
        hour = Math.max(0, Math.min(23, hour));
        minute = Math.max(0, Math.min(59, minute));
        message = message == null || message.trim().isEmpty() ? "该开始工作了" : message.trim();

        if (persist) {
            try {
                JSONObject obj = new JSONObject();
                obj.put("id", id);
                obj.put("hour", hour);
                obj.put("minute", minute);
                obj.put("message", message);
                context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                        .edit().putString(REMINDER_PREFIX + id, obj.toString()).apply();
            } catch (Exception ignored) {}
        }

        Calendar now = Calendar.getInstance();
        Calendar next = Calendar.getInstance();
        next.set(Calendar.HOUR_OF_DAY, hour);
        next.set(Calendar.MINUTE, minute);
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);
        if (!next.after(now)) next.add(Calendar.DAY_OF_YEAR, 1);

        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.setAction("com.gina.pomodoro.DAILY_REMINDER");
        intent.putExtra("type", "daily");
        intent.putExtra("id", id);
        intent.putExtra("hour", hour);
        intent.putExtra("minute", minute);
        intent.putExtra("message", message);

        PendingIntent pi = PendingIntent.getBroadcast(
                context,
                requestCodeFor("daily_" + id),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        setAlarm(context, next.getTimeInMillis(), pi);
    }

    static void cancelDailyReminder(Context context, String id, boolean removePersisted) {
        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.setAction("com.gina.pomodoro.DAILY_REMINDER");
        PendingIntent pi = PendingIntent.getBroadcast(
                context,
                requestCodeFor("daily_" + id),
                intent,
                PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
        );
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (pi != null && am != null) am.cancel(pi);
        if (removePersisted) {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .edit().remove(REMINDER_PREFIX + id).apply();
        }
    }

    static void schedulePomodoro(Context context, long focusEndMs, long breakEndMs) {
        cancelPomodoro(context, false);
        long now = System.currentTimeMillis();
        SharedPreferences sp = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        sp.edit()
                .putLong(TIMER_FOCUS_END, focusEndMs)
                .putLong(TIMER_BREAK_END, breakEndMs)
                .apply();

        if (focusEndMs > now) {
            Intent focusIntent = new Intent(context, AlarmReceiver.class);
            focusIntent.setAction("com.gina.pomodoro.BREAK_START");
            focusIntent.putExtra("type", "break_start");
            PendingIntent focusPi = PendingIntent.getBroadcast(
                    context, 90001, focusIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            setAlarm(context, focusEndMs, focusPi);
        }

        if (breakEndMs > now) {
            Intent breakIntent = new Intent(context, AlarmReceiver.class);
            breakIntent.setAction("com.gina.pomodoro.BREAK_END");
            breakIntent.putExtra("type", "break_end");
            PendingIntent breakPi = PendingIntent.getBroadcast(
                    context, 90002, breakIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            setAlarm(context, breakEndMs, breakPi);
        }
    }

    static void cancelPomodoro(Context context, boolean clearPersisted) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am != null) {
            Intent i1 = new Intent(context, AlarmReceiver.class);
            i1.setAction("com.gina.pomodoro.BREAK_START");
            PendingIntent p1 = PendingIntent.getBroadcast(context, 90001, i1,
                    PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
            if (p1 != null) am.cancel(p1);

            Intent i2 = new Intent(context, AlarmReceiver.class);
            i2.setAction("com.gina.pomodoro.BREAK_END");
            PendingIntent p2 = PendingIntent.getBroadcast(context, 90002, i2,
                    PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
            if (p2 != null) am.cancel(p2);
        }
        if (clearPersisted) clearTimerPersistence(context);
    }

    static void clearTimerPersistence(Context context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().remove(TIMER_FOCUS_END).remove(TIMER_BREAK_END).apply();
    }

    static void rescheduleAll(Context context) {
        SharedPreferences sp = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        for (Map.Entry<String, ?> entry : sp.getAll().entrySet()) {
            if (!entry.getKey().startsWith(REMINDER_PREFIX)) continue;
            Object value = entry.getValue();
            if (!(value instanceof String)) continue;
            try {
                JSONObject obj = new JSONObject((String) value);
                scheduleDailyReminder(context,
                        obj.getString("id"),
                        obj.getInt("hour"),
                        obj.getInt("minute"),
                        obj.getString("message"),
                        false);
            } catch (Exception ignored) {}
        }

        long now = System.currentTimeMillis();
        long focusEnd = sp.getLong(TIMER_FOCUS_END, 0L);
        long breakEnd = sp.getLong(TIMER_BREAK_END, 0L);
        if (breakEnd > now) schedulePomodoro(context, focusEnd, breakEnd);
        else clearTimerPersistence(context);
    }

    static boolean canScheduleExactAlarms(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        return am != null && am.canScheduleExactAlarms();
    }

    private static void setAlarm(Context context, long triggerAtMs, PendingIntent pi) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pi);
        } else {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pi);
        }
    }

    private static int requestCodeFor(String key) {
        return key.hashCode() & 0x7fffffff;
    }
}
