import { useEffect, useState } from 'react';
import WalletCard from '@/components/wallet/WalletCard';
import TopUpHistory from '@/components/wallet/TopUpHistory';
import WithdrawalsList from '@/components/wallet/WithdrawalsList';
import { useAuth } from '@/hooks/useAuth';

export default function WalletSection() {
  const { profile, isLoading, refreshProfile } = useAuth();
  const [historyVersion, setHistoryVersion] = useState(0);
  const [openWithdraw, setOpenWithdraw] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#withdraw') {
      setOpenWithdraw(true);
    }

    const onHashChange = () => {
      if (window.location.hash === '#withdraw') {
        setOpenWithdraw(true);
      }
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (isLoading) return null;

  return (
    <div
      id="wallet"
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-3 pt-8 sm:px-6 sm:pt-10"
    >
      <WalletCard
        profile={profile}
        openWithdrawInitially={openWithdraw}
        onWithdrawModalChange={setOpenWithdraw}
        onTopUpSubmitted={() => {
          setHistoryVersion((value) => value + 1);
          void refreshProfile();
        }}
      />
      {profile && (
        <>
          <TopUpHistory key={`topup-${historyVersion}`} />
          <WithdrawalsList key={`withdraw-${historyVersion}`} userId={profile.id} />
        </>
      )}
    </div>
  );
}
