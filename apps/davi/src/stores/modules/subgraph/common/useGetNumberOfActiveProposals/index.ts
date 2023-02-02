import { useQuery } from '@apollo/client';
import { useMemo } from 'react';
import {
  getNumberOfActiveProposalsDocument,
  getNumberOfActiveProposalsQuery,
} from '.graphclient';
import { BigNumber } from 'ethers';
import { useListenToProposalStateChanged } from 'stores/modules/common/events/useListenToProposalStateChanged';

export const useGetNumberOfActiveProposals = (guildAddress: string) => {
  const { data, refetch, loading, error } =
    useQuery<getNumberOfActiveProposalsQuery>(
      getNumberOfActiveProposalsDocument,
      {
        variables: { id: guildAddress?.toLowerCase() },
      }
    );
  const transformedData = useMemo(() => {
    if (!data?.guild) return undefined;
    const activeProposals = data.guild.proposals;
    return {
      activeProposals: BigNumber.from(activeProposals.length),
    };
  }, [data]);
  useListenToProposalStateChanged(guildAddress, refetch);

  return {
    data: transformedData,
    refetch,
    isLoading: loading,
    isError: !!error,
  };
};
