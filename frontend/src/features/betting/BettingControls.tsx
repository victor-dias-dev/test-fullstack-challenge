import { useBettingPanel } from "./useBettingPanel";
import { BettingLoginPrompt } from "./BettingLoginPrompt";
import { BettingPanelLayout } from "./BettingPanelLayout";
import { WalletBalanceBanner } from "./WalletBalanceBanner";
import { BettingToast } from "./BettingToast";
import { AutoBetSection } from "./AutoBetSection";
import { StakeInputSection } from "./StakeInputSection";
import { AutoCashoutSection } from "./AutoCashoutSection";
import { AutoBetScheduleNotice } from "./AutoBetScheduleNotice";
import { BetPrimaryActions } from "./BetPrimaryActions";

export function BettingControls() {
  const p = useBettingPanel();

  if (!p.isAuthenticated) {
    return <BettingLoginPrompt />;
  }

  return (
    <BettingPanelLayout phase={p.phase}>
      {p.wallet && <WalletBalanceBanner wallet={p.wallet} />}
      {p.toast && <BettingToast toast={p.toast} />}

      <AutoBetSection
        autoBetEnabled={p.autoBetEnabled}
        onToggleAutoBet={p.onToggleAutoBet}
        autoBetStrategy={p.autoBetStrategy}
        onStrategyChange={p.setAutoBetStrategy}
        baseReais={p.baseReais}
        onBaseReaisChange={p.setBaseAmountCents}
        stopLossCents={p.stopLossCents}
        stopLossReais={p.stopLossReais}
        onStopLossChange={p.setStopLossCents}
        nextStakeReais={p.nextStakeReais}
        sessionPnLCents={p.sessionPnLCents}
      />

      <StakeInputSection
        amountReais={p.amountReais}
        amountCents={p.amountCents}
        canBetManual={p.canBetManual}
        onAmountCentsChange={p.setAmountCents}
      />

      <AutoCashoutSection
        enabled={p.autoCashoutEnabled}
        onEnabledChange={p.setAutoCashoutEnabled}
        multiplier={p.autoCashoutMultiplier}
        onMultiplierChange={p.setAutoCashoutMultiplier}
      />

      {p.autoBetEnabled && p.phase === "BETTING" && !p.myBet && (
        <AutoBetScheduleNotice nextStakeReais={p.nextStakeReais} />
      )}

      <BetPrimaryActions
        phase={p.phase}
        myBet={p.myBet}
        autoBetEnabled={p.autoBetEnabled}
        amountReais={p.amountReais}
        currentMultiplier={p.currentMultiplier}
        potentialPayout={p.potentialPayout}
        canBetManual={p.canBetManual}
        canCashOut={p.canCashOut}
        placeBetMutation={p.placeBetMutation}
        cashOutMutation={p.cashOutMutation}
        onPlaceBet={p.onPlaceBet}
        onCashOut={p.onCashOut}
      />
    </BettingPanelLayout>
  );
}
