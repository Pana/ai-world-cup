import { z } from "zod";

export const scheduleTeamSchema = z.object({
  code: z.string().length(3),
  name: z.string().min(1)
});

export const scheduleMatchSchema = z.object({
  externalId: z.string().min(1),
  matchNumber: z.number().int().positive(),
  stageCode: z.string().min(1),
  stageName: z.string().min(1),
  stageType: z.enum(["group", "knockout"]),
  stageSequence: z.number().int().positive(),
  groupCode: z.string().min(1).nullable().optional(),
  groupName: z.string().min(1).nullable().optional(),
  homeTeamCode: z.string().length(3).nullable().optional(),
  awayTeamCode: z.string().length(3).nullable().optional(),
  homePlaceholder: z.string().nullable().optional(),
  awayPlaceholder: z.string().nullable().optional(),
  venueName: z.string().nullable().optional(),
  hostCity: z.string().nullable().optional(),
  scheduledAt: z.iso.datetime(),
  status: z
    .enum(["scheduled", "live", "finished", "postponed", "cancelled"])
    .default("scheduled"),
  homeScore90: z.number().int().nonnegative().nullable().optional(),
  awayScore90: z.number().int().nonnegative().nullable().optional(),
  homeScoreAfterExtraTime: z.number().int().nonnegative().nullable().optional(),
  awayScoreAfterExtraTime: z.number().int().nonnegative().nullable().optional(),
  homePenaltyScore: z.number().int().nonnegative().nullable().optional(),
  awayPenaltyScore: z.number().int().nonnegative().nullable().optional(),
  winnerTeamCode: z.string().length(3).nullable().optional(),
  resultType: z
    .enum(["regular_time", "extra_time", "penalties"])
    .nullable()
    .optional(),
  startedAt: z.iso.datetime().nullable().optional(),
  finishedAt: z.iso.datetime().nullable().optional(),
  sourceUpdatedAt: z.iso.datetime().nullable().optional()
});

export const scheduleDocumentSchema = z.object({
  tournament: z.object({
    slug: z.string().min(1),
    name: z.string().min(1),
    edition: z.string().min(1),
    hostCountries: z.array(z.string().min(2)),
    startsAt: z.iso.date(),
    endsAt: z.iso.date(),
    teamCount: z.number().int().positive(),
    matchCount: z.number().int().positive(),
    status: z.enum(["draft", "upcoming", "active", "completed"])
  }),
  matches: z.array(scheduleMatchSchema)
});

export type ScheduleDocument = z.infer<typeof scheduleDocumentSchema>;
export type ScheduleMatch = z.infer<typeof scheduleMatchSchema>;
