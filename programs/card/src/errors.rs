use anchor_lang::error_code;

#[error_code]
pub enum CardGameError {
    TileOutOfBounds,
    PositionOutOfBounds,
    EmptyBoardSpace,
    TileAlreadySet,
    GameAlreadyOver,
    NotPlayersTurn,
    GameAlreadyStarted,
    EnemyBoardPositionEmpty,
    AllyBoardPositionEmpty,
    CannotAttackOwnHero,
    UnitIsNotReady,
    InsufficientMana,
    ScoreTooLow,
    ScoreTooHigh,
    UserAlreadyExists,
    UserStatsAccountMissing,
    OpposingStatsAccountMissing,
    YouHaveAnActiveGame,
    OpponentHasAnActiveGame,
    NameTooLong,
    GameStillActive,
    MismatchPlayerKeys,
    CardIndexOutOfBounds,
}