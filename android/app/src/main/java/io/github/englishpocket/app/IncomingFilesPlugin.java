package io.github.englishpocket.app;

import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import androidx.core.content.IntentCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.UUID;

/** Explicit local JSON shares only. No network downloads, broad storage permission, or auto-import. */
@CapacitorPlugin(name = "IncomingFiles")
public class IncomingFilesPlugin extends Plugin {
    private static final int LIMIT = 10 * 1024 * 1024;
    private final ArrayDeque<JSObject> pending = new ArrayDeque<>();

    @Override
    protected void handleOnNewIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (!Intent.ACTION_SEND.equals(action) && !Intent.ACTION_VIEW.equals(action)) return;
        Uri uri = Intent.ACTION_VIEW.equals(action) ? intent.getData()
            : IntentCompat.getParcelableExtra(intent, Intent.EXTRA_STREAM, Uri.class);
        CharSequence extra = uri == null && Intent.ACTION_SEND.equals(action)
            ? intent.getCharSequenceExtra(Intent.EXTRA_TEXT) : null;
        String shared = extra == null ? null : extra.toString();
        if (uri == null && shared == null) return;
        getBridge().execute(() -> receive(uri, shared));
    }

    private void receive(Uri uri, String shared) {
        JSObject value = new JSObject();
        value.put("token", UUID.randomUUID().toString());
        value.put("name", "分享的题包.json");
        try {
            byte[] bytes;
            if (uri != null) {
                if (!"content".equals(uri.getScheme())) throw new Exception("请分享本地 JSON 文件，不接收网络链接。");
                try (Cursor cursor = getContext().getContentResolver().query(uri,
                        new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
                    if (cursor != null && cursor.moveToFirst()) {
                        String name = cursor.getString(0);
                        if (name != null) value.put("name", name.substring(0, Math.min(name.length(), 150)));
                    }
                }
                try (InputStream input = getContext().getContentResolver().openInputStream(uri);
                     ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                    if (input == null) throw new Exception("无法读取文件，请在拾词内手动选择。");
                    byte[] buffer = new byte[8192];
                    int count;
                    while ((count = input.read(buffer)) != -1) {
                        if (output.size() + count > LIMIT) throw new Exception("题包 JSON 不得超过 10 MB。");
                        output.write(buffer, 0, count);
                    }
                    bytes = output.toByteArray();
                }
            } else {
                if (shared.length() > LIMIT) throw new Exception("题包 JSON 过大。");
                bytes = shared.getBytes(StandardCharsets.UTF_8);
            }
            if (bytes.length > LIMIT) throw new Exception("题包 JSON 不得超过 10 MB。");
            String text = StandardCharsets.UTF_8.newDecoder()
                .onMalformedInput(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString();
            value.put("text", text);
        } catch (Exception error) {
            value.put("error", "文件读取失败：请确认它是小于 10 MB 的 UTF-8 JSON，并可尝试在拾词内选择文件。");
        }
        synchronized (pending) {
            if (hasListeners("incomingFile")) notifyListeners("incomingFile", value);
            else if (pending.size() < 3) pending.add(value);
        }
    }

    @PluginMethod
    public void consume(PluginCall call) {
        JSArray result = new JSArray();
        synchronized (pending) { while (!pending.isEmpty()) result.put(pending.remove()); }
        JSObject value = new JSObject(); value.put("files", result); call.resolve(value);
    }
}
