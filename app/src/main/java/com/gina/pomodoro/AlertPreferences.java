package com.gina.pomodoro;

import android.content.Context;
import android.content.SharedPreferences;

final class AlertPreferences {
    private static final String PREFS = "pomodoro_alerts_v4";
    private static final String KEY_SOUND = "sound_enabled";
    private static final String KEY_VIBRATE = "vibration_enabled";

    private AlertPreferences() {}

    static boolean isSoundEnabled(Context context) {
        return prefs(context).getBoolean(KEY_SOUND, true);
    }

    static boolean isVibrationEnabled(Context context) {
        return prefs(context).getBoolean(KEY_VIBRATE, true);
    }

    static void setSoundEnabled(Context context, boolean enabled) {
        prefs(context).edit().putBoolean(KEY_SOUND, enabled).apply();
    }

    static void setVibrationEnabled(Context context, boolean enabled) {
        prefs(context).edit().putBoolean(KEY_VIBRATE, enabled).apply();
    }

    static String channelId(Context context) {
        boolean sound = isSoundEnabled(context);
        boolean vibration = isVibrationEnabled(context);
        if (sound && vibration) return "alerts_v4_sound_vibration";
        if (sound) return "alerts_v4_sound";
        if (vibration) return "alerts_v4_vibration";
        return "alerts_v4_silent";
    }

    static String channelName(Context context) {
        boolean sound = isSoundEnabled(context);
        boolean vibration = isVibrationEnabled(context);
        if (sound && vibration) return "一粒番茄茄 · 声音和震动";
        if (sound) return "一粒番茄茄 · 声音";
        if (vibration) return "一粒番茄茄 · 震动";
        return "一粒番茄茄 · 静默提醒";
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
