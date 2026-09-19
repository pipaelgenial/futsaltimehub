"""One-off migration: align stint outMinute with actual played duration.

Historical matches stored `outMinute` for stints closed at end of a half
as the FULL half length (halfDuration), even when the game clock was paused
for most of the half. This inflated `outMinute - inMinute` beyond the actual
played `duration`.

This script rewrites each closed single-half stint so:
    outMinute = inMinute + duration

It also recomputes `totalTime` per player as the sum of stint durations,
and `total_duration` for the match as the sum of the max outMinute per half.
"""

import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')


async def main():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    matches = await db.matches.find({}).to_list(10000)
    print(f"Found {len(matches)} matches")
    fixed = 0
    for m in matches:
        players = m.get('players') or []
        changed = False
        for p in players:
            stints = p.get('stints') or []
            for s in stints:
                in_min = s.get('inMinute') or 0
                out_min = s.get('outMinute')
                dur = s.get('duration')
                in_half = s.get('inHalf', 1)
                out_half = s.get('outHalf')
                # Only fix closed, single-half stints where duration is known
                if out_half is None or out_half != in_half or dur is None:
                    continue
                expected_out = in_min + dur
                if out_min != expected_out:
                    s['outMinute'] = expected_out
                    changed = True
            # Recompute totalTime from stint durations
            new_total = sum((s.get('duration') or 0) for s in stints)
            if stints and p.get('totalTime') != new_total:
                p['totalTime'] = new_total
                changed = True
        # Recompute total_duration = sum(max outMinute per half across all players)
        max_by_half = {}
        for p in players:
            for s in (p.get('stints') or []):
                h = s.get('outHalf') or s.get('inHalf', 1)
                om = s.get('outMinute') or 0
                if om > max_by_half.get(h, 0):
                    max_by_half[h] = om
        new_total_dur = sum(max_by_half.values())
        if new_total_dur > 0 and m.get('total_duration') != new_total_dur:
            m['total_duration'] = new_total_dur
            changed = True
        if changed:
            await db.matches.replace_one({'_id': m['_id']}, m)
            fixed += 1
            print(f"  Fixed match: {m.get('opponent')} (total_duration={m.get('total_duration')})")
    print(f"\nMigration complete: {fixed} matches updated.")
    client.close()


if __name__ == '__main__':
    asyncio.run(main())
