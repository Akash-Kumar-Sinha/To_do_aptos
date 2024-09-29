import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";
import Home from "./Home";
import { PetraWallet } from "petra-plugin-wallet-adapter";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";

const App = () => {
  const wallets = [new PetraWallet()];

  return (
    <AptosWalletAdapterProvider plugins={wallets} autoConnect={true}>
      <Home />
    </AptosWalletAdapterProvider>
  );
};

export default App;
