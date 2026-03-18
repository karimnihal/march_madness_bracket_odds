import { impliedProb, devig } from '../utils/odds';

export default function FirstFour({ firstFourData, picks, onPick, teamsById, className = '' }) {
  const formatPct = (p) => `${(p * 100).toFixed(1)}%`;

  return (
    <div className={`first-four ${className}`}>
      <h2 className="first-four-title">FIRST FOUR</h2>
      <div className="first-four-games">
        {firstFourData.map(game => {
          const [t1Id, t2Id] = game.teams;
          const t1 = teamsById[t1Id];
          const t2 = teamsById[t2Id];

          // Skip rendering this game if team data is missing
          if (!t1 || !t2) {
            console.warn('FirstFour: missing team data for game', game);
            return null;
          }

          const p1Raw = impliedProb(game.moneylines[t1Id]);
          const p2Raw = impliedProb(game.moneylines[t2Id]);
          const [p1, p2] = devig([p1Raw, p2Raw]);

          const currentPick = picks[game.id];

          return (
            <div key={game.id} className={`ff-game ${currentPick ? 'ff-game--picked' : ''}`}>
              {[
                { team: t1, prob: p1, id: t1Id },
                { team: t2, prob: p2, id: t2Id },
              ].map(({ team, prob, id }) => (
                <div
                  key={id}
                  className={`ff-slot ${currentPick === id ? 'ff-slot--picked' : ''} ${currentPick && currentPick !== id ? 'ff-slot--loser' : ''}`}
                  onClick={() => onPick(game.id, id)}
                >
                  <span className="team-seed">{game.seed}</span>
                  <span className="team-name">{team.shortName}</span>
                  <span className="team-odds">{formatPct(prob)}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
