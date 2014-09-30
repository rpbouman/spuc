package org.pentaho.spuc;

import java.io.OutputStream;
import java.io.IOException;

public interface IDataRenderer {
  public void render(OutputStream outputStream, Object data) throws Exception;
}
