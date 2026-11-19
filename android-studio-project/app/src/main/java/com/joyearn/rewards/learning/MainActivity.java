package com.joyearn.rewards.learning;

import android.net.Uri;
import android.os.Bundle;
import com.google.androidbrowserhelper.trusted.LauncherActivity;

public class MainActivity extends LauncherActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Request Google UMP consent and initialize Google Mobile Ads SDK safely once consent permits
        JoyEarnAdsController.getInstance().gatherConsentAndInitialize(this, null);
    }

    @Override
    protected Uri getLaunchingUrl() {
        return Uri.parse("https://ais-pre-yu4imjtkrbbrtd3hcg63dd-498458785197.asia-east1.run.app");
    }
}
