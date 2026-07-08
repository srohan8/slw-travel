package com.bysloth.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

// Covers what @capacitor-community/background-geolocation and
// @capacitor/geolocation don't expose: ACCESS_BACKGROUND_LOCATION is a
// separate, incremental runtime request on Android 10+ (must be requested
// only after foreground location is already granted, never bundled with
// it), plus the battery-optimization exemption prompt. See
// docs/gps-recording-feature.md for why this exists.
@CapacitorPlugin(
    name = "BackgroundLocationPerms",
    permissions = {
        @Permission(strings = { Manifest.permission.ACCESS_BACKGROUND_LOCATION }, alias = "background")
    }
)
public class BackgroundLocationPermsPlugin extends Plugin {

    @PluginMethod
    public void checkBackgroundLocation(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", isBackgroundLocationGranted());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestBackgroundLocation(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }

        boolean foregroundGranted =
            ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        if (!foregroundGranted) {
            // Android silently drops a background request issued before foreground
            // is granted -- tell the caller why instead of returning a bare false.
            JSObject ret = new JSObject();
            ret.put("granted", false);
            ret.put("foregroundMissing", true);
            call.resolve(ret);
            return;
        }

        if (isBackgroundLocationGranted()) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }

        requestPermissionForAlias("background", call, "backgroundLocationCallback");
    }

    @PermissionCallback
    private void backgroundLocationCallback(PluginCall call) {
        JSObject ret = new JSObject();
        if (isBackgroundLocationGranted()) {
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        // false here means "don't ask again" was hit -- the UI swaps its CTA
        // from "Try again" to "Open Settings" based on this flag.
        boolean canAskAgain = ActivityCompat.shouldShowRequestPermissionRationale(
            getActivity(), Manifest.permission.ACCESS_BACKGROUND_LOCATION
        );
        ret.put("granted", false);
        ret.put("canAskAgain", canAskAgain);
        call.resolve(ret);
    }

    private boolean isBackgroundLocationGranted() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return true;
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_BACKGROUND_LOCATION)
            == PackageManager.PERMISSION_GRANTED;
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.fromParts("package", getContext().getPackageName(), null));
        try {
            getActivity().startActivity(intent);
        } catch (Exception e) {
            // best-effort -- fire and forget, JS re-checks state when the user returns
        }
        call.resolve(new JSObject());
    }

    @PluginMethod
    public void isIgnoringBatteryOptimizations(PluginCall call) {
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        boolean ignoring = pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
        JSObject ret = new JSObject();
        ret.put("ignoring", ignoring);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestIgnoreBatteryOptimizations(PluginCall call) {
        JSObject ret = new JSObject();
        try {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(intent);
            ret.put("shown", true);
        } catch (Exception e) {
            // some OEMs block this intent entirely
            ret.put("shown", false);
        }
        call.resolve(ret);
    }
}
