package io.github.englishpocket.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ReadingLookupPlugin.class);
        registerPlugin(StudyNavigationPlugin.class);
        registerPlugin(IncomingFilesPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
