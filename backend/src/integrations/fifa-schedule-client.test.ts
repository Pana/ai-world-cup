import { describe, expect, it } from "vitest";
import { transformFifaSchedule } from "./fifa-schedule-client.js";

describe("transformFifaSchedule", () => {
  it("maps FIFA calendar matches into the internal schedule contract", () => {
    const document = transformFifaSchedule(
      {
        Results: [
          {
            IdMatch: "400021999",
            MatchNumber: 73,
            IdStage: "289287",
            StageName: [{ Locale: "en-GB", Description: "Round of 32" }],
            GroupName: [],
            Date: "2026-06-28T19:00:00Z",
            MatchStatus: 1,
            ResultType: 0,
            PlaceHolderA: "2A",
            PlaceHolderB: "2B",
            Stadium: {
              Name: [{ Locale: "en-GB", Description: "Los Angeles Stadium" }],
              CityName: [{ Locale: "en-GB", Description: "Los Angeles" }]
            }
          },
          {
            IdMatch: "400021443",
            MatchNumber: 1,
            StageName: [{ Locale: "en-GB", Description: "First Stage" }],
            GroupName: [{ Locale: "en-GB", Description: "Group A" }],
            Date: "2026-06-11T19:00:00Z",
            MatchStatus: 0,
            ResultType: 1,
            PlaceHolderA: "A1",
            PlaceHolderB: "A2",
            Home: {
              IdTeam: "43911",
              Abbreviation: "MEX",
              TeamName: [{ Locale: "en-GB", Description: "Mexico" }]
            },
            Away: {
              IdTeam: "43883",
              Abbreviation: "RSA",
              TeamName: [{ Locale: "en-GB", Description: "South Africa" }]
            },
            HomeTeamScore: 2,
            AwayTeamScore: 0,
            Winner: "43911",
            Stadium: {
              Name: [{ Locale: "en-GB", Description: "Mexico City Stadium" }],
              CityName: [{ Locale: "en-GB", Description: "Mexico City" }]
            }
          }
        ]
      },
      new Date("2026-06-25T00:00:00.000Z")
    );

    expect(document.tournament.slug).toBe("world-cup-2026");
    expect(document.matches).toHaveLength(2);
    expect(document.matches[0]).toMatchObject({
      externalId: "fifa-400021443",
      matchNumber: 1,
      stageCode: "GROUP",
      groupCode: "A",
      homeTeamCode: "MEX",
      awayTeamCode: "RSA",
      status: "finished",
      homeScore90: 2,
      awayScore90: 0,
      winnerTeamCode: "MEX",
      resultType: "regular_time",
      sourceUpdatedAt: "2026-06-25T00:00:00.000Z"
    });
    expect(document.matches[1]).toMatchObject({
      externalId: "fifa-400021999",
      matchNumber: 73,
      stageCode: "R32",
      homeTeamCode: null,
      awayTeamCode: null,
      homePlaceholder: "2A",
      awayPlaceholder: "2B",
      status: "scheduled"
    });
  });
});
