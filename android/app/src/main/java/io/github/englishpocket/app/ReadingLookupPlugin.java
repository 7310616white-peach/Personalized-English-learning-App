package io.github.englishpocket.app;

import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Receives user-selected text from Android's standard selection menu. */
@CapacitorPlugin(name = "ReadingLookup")
public class ReadingLookupPlugin extends Plugin {
    private volatile String pendingText = "";

    @Override
    protected void handleOnNewIntent(Intent intent) {
        if (intent == null || !Intent.ACTION_PROCESS_TEXT.equals(intent.getAction())) return;
        CharSequence selected = intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT);
        if (selected == null) return;
        String text = selected.toString().trim();
        pendingText = text.substring(0, Math.min(text.length(), 100));
        JSObject value = new JSObject();
        value.put("text", pendingText);
        // Cold start is consumed through the method below; a running page gets an event.
        if (hasListeners("selectedText")) {
            notifyListeners("selectedText", value);
            pendingText = "";
        }
    }

    @PluginMethod
    public void consumeSelectedText(PluginCall call) {
        JSObject value = new JSObject();
        value.put("text", pendingText);
        pendingText = "";
        call.resolve(value);
    }
}
