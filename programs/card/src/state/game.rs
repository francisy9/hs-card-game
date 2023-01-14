use anchor_lang::prelude::*;
use crate::errors::CardGameError;


#[account] // Requires certain functions (e.g. (de)serialize T) and sets owner of data to ID 
pub struct Game {
    players: [Pubkey; 2], // 32 * 2
    turn: u8, // 1
    board: [[Option<Card>; 7]; 2], // 14 * (1 + 4) = 70
    state: GameState, // 32 + 1
    health: [i8; 2], // 2
    mana: [i8; 2], // 2
    p1_hand: Vec<Card>, // 10 * 4
    p2_hand: Vec<Card>, // 10 * 4
}

// Max index of cards on each row
const MAX_ROW: u8 = 6;

impl Game {
    pub const MAXIMUM_SIZE: usize = (32 * 2) + 1 + (14 * (1 + 4)) + (32 + 1) +
    2 + 2 + (10 * 4) + (10 * 4);

    pub fn start(&mut self, players: [Pubkey; 2], p1_hand: Vec<Card>, p2_hand: Vec<Card>) -> Result<()> {
        require_eq!(self.turn, 0, CardGameError::GameAlreadyStarted);
        self.players = players;
        self.turn = 1;
        self.health = [30, 30];
        self.mana = [1, 1];
        self.p1_hand = p1_hand;
        self.p2_hand = p2_hand;
        // self.p1_hand.push(Card{hp:10, atk:10, mana:1, moves:0});
        // self.p2_hand.push(Card{hp:15, atk:7, mana:1, moves:0});
        Ok(())
    }

    pub fn is_active(&self) -> bool {
        self.state == GameState::Active
    }

    fn current_player_index(&self) -> usize {
        ((self.turn - 1) % 2) as usize
    }

    pub fn current_player(&self) -> Pubkey {
        self.players[self.current_player_index()]
    }

    // Player 1 has the bottom row; player 2 the top row
    fn current_player_row(&self) -> usize {
        (self.current_player_index() + 1) % 2
    }

    // Plays card from player hand to specific board position on player's row
    pub fn play_card(&mut self, pos: u8, card_index: u8) -> Result<()> {
        require!(self.is_active(), CardGameError::GameAlreadyOver);

        if pos <= MAX_ROW {

            let player = self.current_player_index();
            let row = self.current_player_row();
            let pos = pos as usize;
            let card_index = card_index as usize;

            match self.board[row][pos] {

                Some(_) => return Err(CardGameError::TileAlreadySet.into()),

                None => {
                    let card;
                    if player == 0 {
                        if self.p1_hand.len() <= card_index {
                            return Err(CardGameError::CardIndexOutOfBounds.into())
                        }

                        card = self.p1_hand[card_index];
                        if card.mana > self.mana[player] {
                            return Err(CardGameError::InsufficientMana.into())

                        }
                        self.p1_hand.remove(card_index);
                        self.mana[0] -= card.mana;

                    } else {
                        if self.p2_hand.len() <= card_index {
                            return Err(CardGameError::CardIndexOutOfBounds.into())
                        }

                        card = self.p2_hand[card_index];
                        if card.mana > self.mana[player] {
                            return Err(CardGameError::InsufficientMana.into())

                        }
                        self.p2_hand.remove(card_index);
                        self.mana[1] -= card.mana;

                    }
                    self.board[row][pos] = Some(card);
                    
                }
            }
        } else {
            return Err(CardGameError::TileOutOfBounds.into())
        }

        self.update_state();


        Ok(())
    }


    // Check if either hero is 0hp or less or if game can continue
    fn update_state(& mut self) {
        
        if self.health[0] <= 0 && self.health[1] > 0 {
            self.state = GameState::Won {
                winner: self.players[1],
            }
        } else if self.health[0] > 0 && self.health[1] <= 0 {
            self.state = GameState::Won {
                winner: self.players[0],
            }
        }


        // Tie game if no player has cards left and heros are still alive
        for arr in self.board {
            for cell in arr {
                if cell.is_some() {
                    return;
                }
            }
        }
        if self.p1_hand.is_empty() && self.p2_hand.is_empty() {
            self.state = GameState::Tie;
        }

    }


    // Finishes current player's turn and iterates turn 
    pub fn end_turn(& mut self) -> Result<()> {
        require!(self.is_active(), CardGameError::GameAlreadyOver);

        // Reset unit moves, so they can move next turn
        for mut unit in &mut self.board[self.current_player_row()] {
            if let Some(card) = &mut unit {
                card.moves = 1;
            }
        }
        if self.mana[self.current_player_index()] < 10 {
            self.mana[self.current_player_index()] = (self.turn as i8- 1) / 2 + 2;
        }
        self.turn += 1;
        Ok(())
    }

    
    // Checks user chosen units are valid then calls helper atk helper func
    pub fn attack(&mut self, bot_pos: u8, top_pos: u8) -> Result<()> {
        require!(self.is_active(), CardGameError::GameAlreadyOver);
        
        let _hero_pos = MAX_ROW + 1;

        match (bot_pos, top_pos) {
            (0..=MAX_ROW, 0..=MAX_ROW) =>
                self.attack_unit(bot_pos as usize, top_pos as usize),

            (_hero_pos, 0..=MAX_ROW) | (0..=MAX_ROW, _hero_pos) => 
                self.attack_hero(bot_pos as usize, top_pos as usize),

            (_, _) =>
                Err(CardGameError::PositionOutOfBounds.into())
        }
    }
    

    // Deducts hp from the attacking and attacked unit
    fn attack_unit(&mut self, bot_pos: usize, top_pos: usize) -> Result<()> {

        let user_row = self.current_player_row();
        // Use split_at_mut to borrow two mutable references
        // One into bottom row, other into top row
        let (top_row, bottom_row)
            = self.board.split_at_mut(1);


        if let (Some(bot_unit), Some(top_unit))
            = (&mut bottom_row[0][bot_pos], &mut top_row[0][top_pos]) {
                if user_row == 1 {
                    if bot_unit.moves == 0 {
                        return Err(CardGameError::UnitIsNotReady.into())
                    } else {
                        bot_unit.moves = 0;
                    }
                } else {
                    if top_unit.moves == 0 {
                        return Err(CardGameError::UnitIsNotReady.into())
                    } else {
                        top_unit.moves = 0;
                    }
                }

                bot_unit.hp -= top_unit.atk;
                top_unit.hp -= bot_unit.atk;

                self.update_board();
        } else {
            return Err(CardGameError::EmptyBoardSpace.into())
        }

        self.update_state();
        Ok(())
    }

    // Deducts hp from the attacked hero
    fn attack_hero(&mut self, bot_pos: usize, top_pos: usize) -> Result<()> {
        // No update board run in this func since no unit can die
        
        // Attacking bottom hero
        if bot_pos == 7 {

            // Attacking self throw error
            if self.current_player_index() == 0 {
                return Err(CardGameError::CannotAttackOwnHero.into())

            } else {
                if let Some(unit) = &mut self.board[0][top_pos] {
                    if unit.moves == 0 {
                        return Err(CardGameError::UnitIsNotReady.into())
                    } else {
                        unit.moves = 0;
                    }
                    self.health[0] -= unit.atk;
                } else {
                    return Err(CardGameError::EmptyBoardSpace.into())
                }

            }
        
        // Attacking top hero
        } else {

            // Attacking self throw error
            if self.current_player_index() == 1 {
                return Err(CardGameError::CannotAttackOwnHero.into())

            } else {
                if let Some(unit) = & mut self.board[1][bot_pos] {
                    if unit.moves == 0 {
                        return Err(CardGameError::UnitIsNotReady.into())
                    } else {
                        unit.moves = 0;
                    }
                    self.health[1] -= unit.atk;
                } else {
                    return Err(CardGameError::EmptyBoardSpace.into())
                }
            }

        }

        self.update_state();
        Ok(())
    }

    // Clear out units with 0 or less hp
    fn update_board(&mut self) {
        for i in 0..2 {

            for j in 0..=MAX_ROW as usize {

                if let Some(unit) = self.board[i][j] {
                    if unit.hp <= 0 {
                        self.board[i][j] = None;
                    }
                } 
            }
        }
    }

    pub fn get_game_state(&self) -> GameState {
        return self.state;
    }


    pub fn match_pubkeys(&self, input: [Pubkey; 2]) -> bool {
        if self.players == input {
            return true
        }

        if self.players[1] == input[0] && self.players[0] == input[1] {
            return true
        }

        return false
    }

}



#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Copy)]
pub enum GameState {
    Active,
    Tie,
    Won { winner: Pubkey },
}

// Card struct
#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize, Copy)]
pub struct Card {
    pub hp: i8, // 1
    pub atk: i8, // 1
    pub mana: i8, // 1
    pub moves: i8, // 1
}