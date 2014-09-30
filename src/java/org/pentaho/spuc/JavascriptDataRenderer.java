package org.pentaho.spuc;

import java.io.OutputStream;
import java.io.File;
import java.io.FileInputStream;

public class JavascriptDataRenderer implements IDataRenderer {

  protected OutputStream outputStream;

  public void render(OutputStream outputStream, Object o) throws Exception {
    this.outputStream = outputStream;
    render(o);
  }

  protected void render(Object o) throws Exception {
    if (o instanceof File) {
      renderFile((File)o);
    }
  }

  protected void renderFile(File file) throws Exception {
    String name = file.getName();
    if (!file.exists()) throw new SpucException("File not found", 404);
    if (!file.isFile() || !name.endsWith(".js")) throw new SpucException("Not a javascript file", 500);
    int buffLen = 4096;
    int read;
    byte[] buff = new byte[buffLen];
    FileInputStream is = new FileInputStream(file);
    do {
      read = is.read(buff);
      outputStream.write(buff, 0, read);
    } while (read == buffLen);
  }

}
