package com.copvsrobbers.config

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.copvsrobbers.BuildConfig

class AppConfigModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "AppConfig"

  override fun getConstants(): MutableMap<String, Any> {
    val constants: MutableMap<String, Any> = HashMap()
    constants["API_BASE_URL"] = BuildConfig.PNT_API_BASE_URL
    constants["IS_STAGE"] = BuildConfig.PNT_STAGE
    constants["TURN_URL"] = BuildConfig.PNT_TURN_URL
    constants["TURN_USERNAME"] = BuildConfig.PNT_TURN_USERNAME
    constants["TURN_CREDENTIAL"] = BuildConfig.PNT_TURN_CREDENTIAL
    return constants
  }
}

