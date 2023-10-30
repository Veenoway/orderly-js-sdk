import { FC, useContext, useMemo, useState } from "react";
import { ChainListView } from "@/block/pickers/chainPicker";
import Button from "@/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "@/dialog";
import { ARBITRUM_MAINNET_CHAINID_HEX, type API } from "@orderly.network/types";
import { useChains, OrderlyContext } from "@orderly.network/hooks";
import { ArrowIcon, NetworkImage } from "@/icon";
import { WalletConnectorContext } from "@/provider";

interface ChainsProps {
  disabled?: boolean;
}

export const Chains: FC<ChainsProps> = (props) => {
  const { disabled } = props;

  const [open, setOpen] = useState(false);
  const { onlyTestnet } = useContext<any>(OrderlyContext);
  const [defaultChain, setDefaultChain] = useState<string>(
    ARBITRUM_MAINNET_CHAINID_HEX
  );

  const [testChains] = useChains("testnet", {
    wooSwapEnabled: true,
    pick: "network_infos",
    filter: (item: API.Chain) => item.network_infos?.chain_id === 421613,
  });

  const [mainChains, { findByChainId }] = useChains("mainnet", {
    wooSwapEnabled: true,
    pick: "network_infos",
    filter: (chain: any) =>
      chain.network_infos?.bridge_enable || chain.network_infos?.bridgeless,
  });

  const { connectedChain, setChain, settingChain } = useContext(
    WalletConnectorContext
  );

  const chainName = useMemo(() => {
    const chain = findByChainId(
      parseInt(connectedChain?.id || defaultChain),
      "network_infos"
    );

    if (!chain) return <span>Unknown</span>;

    if (chain.chain_id === 421613) {
      return <span>Testnet</span>;
    }

    return <NetworkImage id={chain.chain_id} type="chain" size={16} />;
  }, [connectedChain, findByChainId, defaultChain]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button
          variant={"outlined"}
          size={"small"}
          color={"buy"}
          loading={settingChain}
          disabled={disabled}
          className={
            "border-[rgba(38,254,254,1)] gap-1 text-base-contrast h-[30px]"
          }
        >
          {chainName}
          <ArrowIcon size={8} />
        </Button>
      </DialogTrigger>
      <DialogContent onOpenAutoFocus={(event) => event.preventDefault()}>
        <DialogHeader>Swith network</DialogHeader>
        <DialogBody className="max-h-[340px] overflow-y-auto">
          <ChainListView
            mainChains={onlyTestnet ? [] : mainChains}
            testChains={testChains}
            onItemClick={(item: any) => {
              // console.log(item);
              setOpen(false);
              if (connectedChain) {
                setChain({ chainId: item.id }).then((success: boolean) => {
                  // reset default chain when switch to connected chain
                  if (defaultChain !== ARBITRUM_MAINNET_CHAINID_HEX) {
                    setDefaultChain(ARBITRUM_MAINNET_CHAINID_HEX);
                  }
                });
              } else {
                setDefaultChain(item.id);
              }
            }}
            currentChainId={parseInt(connectedChain?.id || defaultChain)}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};
