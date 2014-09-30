package org.pentaho.spuc;

import java.io.OutputStream;
import java.io.IOException;

import org.pentaho.di.core.exception.KettleException;

import org.pentaho.di.trans.step.StepMeta;
import org.pentaho.di.trans.TransMeta;

public class XmlDataRenderer implements IDataRenderer {

  protected void renderStepMetaInterface(OutputStream outputStream, StepMeta stepMeta) throws Exception {
    outputStream.write(stepMeta.getXML().getBytes());
  }

  protected void renderTransMeta(OutputStream outputStream, TransMeta transMeta) throws Exception {
    outputStream.write(transMeta.getXML().getBytes());
  }

  public void render(OutputStream outputStream, Object data) throws Exception {
    if (data instanceof StepMeta) {
      renderStepMetaInterface(outputStream, (StepMeta)data);
    }
    else
    if (data instanceof TransMeta) {
      renderTransMeta(outputStream, (TransMeta)data);
    }
  }

}
