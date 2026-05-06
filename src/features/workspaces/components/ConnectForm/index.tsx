"use client";
import { ConnectFormProvider } from "./ConnectForm.context";
import { ConnectForm as ConnectFormInner } from "./ConnectForm";
export function ConnectForm() {
  return <ConnectFormProvider><ConnectFormInner /></ConnectFormProvider>;
}
export { ConnectFormProvider, useConnectForm } from "./ConnectForm.context";
