package com.policevsthieves.config

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.policevsthieves.BuildConfig

class AppConfigModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "AppConfig"

  override fun getConstants(): MutableMap<String, Any> {
    val constants: MutableMap<String, Any> = HashMap()
    constants["API_BASE_URL"] = BuildConfig.PNT_API_BASE_URL
    constants["IS_STAGE"] = BuildConfig.PNT_STAGE
    return constants
  }
}

