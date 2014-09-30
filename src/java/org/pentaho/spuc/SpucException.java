package org.pentaho.spuc;

import java.io.IOException;
import javax.servlet.http.HttpServletResponse;

class SpucException extends Exception {
  protected int code;

  SpucException(String message, int code) {
    super(message);
    setCode(code);
  }

  SpucException(String message, int code, Throwable cause) {
    super(message, cause);
    setCode(code);
  }

  public void setCode(int code) {
    this.code = code;
  }

  public int getCode() {
    return code;
  }

  public String getMessage() {
    String message = super.getMessage();
    Throwable cause = getCause();
    if (cause != null) {
      message += " " + cause.getMessage();
    }
    return message;
  }

  public void sendError(HttpServletResponse response) throws IOException {
    response.sendError(getCode(), getMessage());
  }
}
