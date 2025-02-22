import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from 'components/primitives/Modal';
import {
  BackIcon,
  ButtonContainer,
  ConnectionError,
  Container,
  Language,
  LanguageBar,
  LanguageList,
  LanguageTitle,
  LanguageValue,
  TransactionsList,
  TransactionsListHeading,
} from './WalletModal.styled';
import { WalletModalProps } from './types';
import { useAccount, useConnect, useDisconnect, useNetwork } from 'wagmi';
import { Option, Transaction, WalletInfoBox } from '../components';
import { getIcon, isReadOnly } from 'provider/wallets';
import { useTransactions } from 'contexts/Guilds';
import { Divider } from 'components/Divider';
import { Button } from 'components/primitives/Button';
import { READ_ONLY_CONNECTOR_ID } from 'provider/ReadOnlyConnector';
import useSwitchNetwork from 'hooks/Guilds/web3/useSwitchNetwork';
import { BiWorld } from 'react-icons/bi';
import { FiChevronRight } from 'react-icons/fi';
import { TiTick } from 'react-icons/ti';
import { supportedLanguages } from 'configs';

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  title,
}) => {
  const { t, i18n } = useTranslation();
  const [isWalletListActive, setIsWalletsListActive] = useState(false);
  const [isLanguagesOpen, setIsLanguagesOpen] = useState(false);
  const { chain } = useNetwork();
  const { chains, switchNetwork } = useSwitchNetwork();
  const { transactions, clearAllTransactions } = useTransactions();
  const { disconnect } = useDisconnect();
  const {
    connector: activeConnector,
    isConnecting,
    isConnected,
  } = useAccount();
  const { connectors, connect, error: connectionError } = useConnect();

  function getOptions() {
    return connectors
      .filter(connector => connector.id !== READ_ONLY_CONNECTOR_ID)
      .map(connector => {
        return (
          <Option
            disabled={!connector.ready}
            key={connector.id}
            onClick={() =>
              activeConnector !== connector && connect({ connector })
            }
            icon={getIcon(connector.id, connector.name)}
            header={connector.name}
            active={activeConnector === connector && isConnected}
            loading={activeConnector === connector && isConnecting}
          />
        );
      });
  }

  function getLanguageName(languageCode) {
    // console.log({ languageCode });
    if (languageCode === 'en-US') return 'English';
    const nameGenerator = new Intl.DisplayNames(languageCode, {
      type: 'language',
    });
    const displayName = nameGenerator.of(languageCode);
    return displayName;
  }

  function getModalContent() {
    if (isConnected && chain?.unsupported) {
      return <Container>{t('connections.pleaseSwitchNetwork')}</Container>;
    }

    if (!isConnected || isWalletListActive || isReadOnly(activeConnector)) {
      return (
        <Container>
          {getOptions()}

          {connectionError && (
            <ConnectionError>{connectionError.message}</ConnectionError>
          )}
        </Container>
      );
    }

    const recentTransactions =
      transactions &&
      transactions
        .sort((tx1, tx2) => tx2.addedTime - tx1.addedTime)
        .slice(0, 5);
    return isLanguagesOpen ? (
      <LanguageList>
        {supportedLanguages.map(languageCode => {
          const currentLanguage = getLanguageName(i18n.language);
          const language = getLanguageName(languageCode);
          return (
            <Language
              onClick={() => {
                i18n.changeLanguage(languageCode);
                setIsLanguagesOpen(false);
              }}
            >
              {language}
              {currentLanguage === language ? <TiTick></TiTick> : <></>}
            </Language>
          );
        })}
      </LanguageList>
    ) : (
      <>
        <LanguageBar onClick={() => setIsLanguagesOpen(true)}>
          <LanguageTitle>
            <BiWorld size={24} />
            {t('language.language')}
          </LanguageTitle>
          <LanguageValue>
            {getLanguageName(i18n.language)}
            <FiChevronRight size={24} />
          </LanguageValue>
        </LanguageBar>
        <WalletInfoBox openOptions={() => setIsWalletsListActive(true)} />
        <Divider />
        <TransactionsList>
          {recentTransactions?.length === 0 ? (
            <TransactionsListHeading>
              {t('transactions.yourTransactionsWillAppearHere')}
            </TransactionsListHeading>
          ) : (
            <>
              <TransactionsListHeading>
                {t('transactions.recentTransactions')}
              </TransactionsListHeading>
              <Divider />
              {recentTransactions?.map(transaction => (
                <Transaction transaction={transaction} key={transaction.hash} />
              ))}
              {recentTransactions?.length > 0 && (
                <ButtonContainer>
                  <Button onClick={clearAllTransactions}>
                    {t('transactions.clearAll')}
                  </Button>
                </ButtonContainer>
              )}
            </>
          )}
        </TransactionsList>
      </>
    );
  }

  const getHeader = () => {
    if (isLanguagesOpen) return t('language.languages');
    if (isConnected && chain?.unsupported) {
      return t('connections.unsupportedNetwork');
    }

    if (isConnected && isWalletListActive && !isReadOnly(activeConnector)) {
      return (
        <BackIcon
          onClick={() => {
            setIsWalletsListActive(false);
          }}
        />
      );
    }

    return isConnected && !isReadOnly(activeConnector)
      ? t('connections.account')
      : title ?? t('connections.connectToAWallet');
  };

  const getPrimaryAction = () => {
    if (isConnected && isWalletListActive && !isReadOnly(activeConnector))
      return () => disconnect();

    if (isConnected && chain?.unsupported && switchNetwork) {
      const firstSupported = chains && chains?.length > 0 ? chains[0] : null;
      return () => switchNetwork(firstSupported.id);
    }

    return null;
  };

  const getPrimaryActionLabel = () => {
    if (isConnected && isWalletListActive && !isReadOnly(activeConnector))
      return t('connections.disconnect');

    if (isConnected && chain?.unsupported) {
      const firstSupported = chains && chains?.length > 0 ? chains[0] : null;

      return t('connections.switchNetworkTo', {
        chainName: firstSupported?.name,
      });
    }

    return null;
  };

  return (
    <Modal
      dataTestId="wallet-modal"
      header={getHeader()}
      isOpen={isOpen}
      onDismiss={() => {
        isLanguagesOpen ? setIsLanguagesOpen(false) : onClose();
      }}
      onConfirm={getPrimaryAction()}
      confirmText={getPrimaryActionLabel()}
      maxWidth={450}
    >
      {getModalContent()}
    </Modal>
  );
};
