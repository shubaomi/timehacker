-- SOFT_LAUNCH is now an onboarding chapter. Graduate only players who have
-- completed every frozen onboarding level; preserve every game and unlock row.
UPDATE "User" AS u
SET "releaseTrack" = 'FULL'
WHERE u."releaseTrack" = 'SOFT_LAUNCH'
  AND u."id" IN (
    SELECT uc."userId"
    FROM "UserCheat" AS uc
    INNER JOIN "CheatMethod" AS cm ON cm."id" = uc."cheatId"
    WHERE cm."slug" IN (
      'four-corner-breach',
      'breath-gap',
      'slow-command',
      'relay-sandwich',
      'corner-cross',
      'precision-five',
      'horizon-shift',
      'focus-orbit',
      'wheel-echo',
      'tab-return',
      'archive-figure-eight',
      'silent-constellation'
    )
    GROUP BY uc."userId"
    HAVING COUNT(DISTINCT cm."slug") = 12
  );
