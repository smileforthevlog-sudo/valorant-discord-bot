// --------------------------------------------------
// Riot / VALORANT service layer
// --------------------------------------------------
//
// Discord commands should use this service instead of
// calling Riot APIs directly.
//
// Real Riot Sign On and VALORANT API calls will be
// connected after production access is approved.
// --------------------------------------------------

export type RiotAccountIdentity = {
  puuid: string;
  gameName: string;
  tagLine: string;
};

export type ValorantPlayerStats = {
  puuid: string;
  riotName: string;
  riotTag: string;

  currentRank: string | null;
  peakRank: string | null;

  wins: number;
  losses: number;

  kd: number | null;
  acs: number | null;
  headshotPercentage: number | null;

  mainAgents: string[];
};

export type RiotServiceStatus =
  | "ready"
  | "not_configured";

export class RiotService {
  getStatus(): RiotServiceStatus {
  const clientId = process.env.RIOT_CLIENT_ID;
  const clientSecret = process.env.RIOT_CLIENT_SECRET;
  const redirectUri = process.env.RIOT_REDIRECT_URI;

  if (
    clientId &&
    clientSecret &&
    redirectUri
  ) {
    return "ready";
  }

  return "not_configured";
}

  async getAccountByPuuid(
    puuid: string
  ): Promise<RiotAccountIdentity | null> {
    console.log(
      `Riot account lookup requested for PUUID: ${puuid}`
    );

    return null;
  }

  async getPlayerStats(
    puuid: string
  ): Promise<ValorantPlayerStats | null> {
    console.log(
      `Valorant stats lookup requested for PUUID: ${puuid}`
    );

    return null;
  }
}

export const riotService = new RiotService();