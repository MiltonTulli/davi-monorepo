import { useMemo } from 'react';
import { BigNumber } from 'ethers';
import { unix } from 'moment';
import { useQuery } from '@apollo/client';
import { getProposalDocument, getProposalQuery } from '.graphclient';
import { ContractState, Proposal } from 'types/types.guilds.d';
import { FetcherHooksInterface } from 'stores/types';
import { useProposalCalls } from 'stores/modules/common/fetchers';
import { useHookStoreProvider } from 'stores';
import { getBigNumberPercentage } from 'utils/bnPercentage';
import useProposalMetadata from 'hooks/Guilds/useProposalMetadata';
import { useTranslation } from 'react-i18next';

type IUseProposal = FetcherHooksInterface['useProposal'];

export const useProposal: IUseProposal = (daoId, proposalId) => {
  const { data, error } = useQuery<getProposalQuery>(getProposalDocument, {
    variables: {
      id: daoId.toLowerCase(),
      proposalId: proposalId.toLowerCase(),
    },
  });
  const proposal = data?.guild?.proposals[0];

  const {
    hooks: {
      fetchers: { useTotalLocked },
    },
  } = useHookStoreProvider();

  const { t } = useTranslation();
  const { data: proposalMetadata } = useProposalMetadata(proposal?.contentHash);
  const { data: totalLocked } = useTotalLocked(daoId, proposalId);

  const parsedData: Proposal = useMemo(() => {
    if (!proposal) return null;

    const {
      id,
      creator,
      startTime,
      endTime,
      to,
      data,
      value,
      title,
      contentHash,
      contractState,
      totalVotes,
      votes,
    } = proposal;

    const contractStatesMapping = {
      1: ContractState.Active,
      2: ContractState.Rejected,
      3: ContractState.Executed,
      4: ContractState.Failed,
    };
    const mappedContractState = contractStatesMapping[parseInt(contractState)];

    const totalVotesBN = totalVotes.map((vote: string) => BigNumber.from(vote));

    const parsedVotes = votes?.map(vote => {
      return {
        voter: vote.voter as `0x${string}`,
        optionLabel: proposalMetadata?.voteOptions[vote.option]
          ? proposalMetadata.voteOptions[vote.option]
          : t('against'),
        votingPower: getBigNumberPercentage(
          BigNumber.from(vote?.votingPower),
          totalLocked,
          2
        ),
      };
    });

    return {
      id: id as `0x${string}`, // typecast to comply with template literal type
      creator,
      startTime: unix(startTime),
      endTime: unix(endTime),
      to,
      data,
      value,
      title,
      contentHash,
      contractState: mappedContractState,
      totalVotes: totalVotesBN,
      options: null,
      votes: parsedVotes,
      totalOptions: null, // Not used in the codebase but in the deploy scripts
    };
  }, [proposal, proposalMetadata?.voteOptions, t, totalLocked]);

  const { options } = useProposalCalls(daoId, proposalId, parsedData);

  if (parsedData) {
    if (options) parsedData.options = options;
  }

  return {
    data: parsedData,
    error,
  };
};
