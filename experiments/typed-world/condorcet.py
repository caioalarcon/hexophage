"""Paired last-conventional-colony votes. Rebuild both CSVs with python3 condorcet.py 4."""
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from itertools import chain, combinations, product

from duels import arenas, persist, roles, run, workers


def tally(legs, horizon, left, right):
    tracks = {}
    outcomes = Counter()
    for row in legs:
        pair = row['attackerPolicy'], row['defenderPolicy']
        if set(pair) != {left, right}:
            continue
        result = row['result'] if int(row['turns']) <= horizon else 'open'
        if result in ('attacker', 'defender'):
            result = row[result + 'Policy']
        outcomes[result] += 1
        key = row['arena'], row['angle'], row['lane']
        results = tracks.setdefault(key, {})
        assert pair not in results
        results[pair] = result
    votes = Counter()
    for track in tracks.values():
        assert set(track) == {(left, right), (right, left)}
        legs = list(track.values())
        if 'open' in legs:
            votes['open'] += 1
        else:
            margin = legs.count(left) - legs.count(right)
            votes[left if margin > 0 else right if margin < 0 else 'tie'] += 1
    assert len(tracks) == 36 and outcomes.total() == 72
    return dict(horizon=horizon, left=left, right=right, tracks=len(tracks),
                leftVotes=votes[left], tieVotes=votes['tie'], rightVotes=votes[right], openVotes=votes['open'],
                legs=outcomes.total(), leftWins=outcomes[left], rightWins=outcomes[right],
                doubleExtinctions=outcomes['draw'], openLegs=outcomes['open'])


if __name__ == '__main__':
    splits = ['discovery', 'validation']
    jobs = [(arena, split, 'terminal', '0', '24', '384') for arena, split in product(arenas, splits)]
    with ThreadPoolExecutor(max_workers=workers) as pool:
        rows = list(chain.from_iterable(pool.map(run, jobs)))
    assert len(rows) == 864
    persist('condorcet-legs.csv', rows)
    matrix = []
    for split in splits:
        sample = [row for row in rows if row['split'] == split]
        for horizon in [96, 384]:
            for left, right in combinations(roles, 2):
                matrix.append(dict(split=split, **tally(sample, horizon, left, right)))
    persist('condorcet-matrix.csv', matrix)
