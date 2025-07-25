use candid::Principal;
use ic_cdk::api::caller;
use ic_cdk_macros::*;
use candid::{CandidType, Deserialize};
use std::cell::RefCell;
use std::collections::HashMap;
use ic_cdk::api::time;

#[derive(CandidType, Deserialize, Clone)]
struct ProjectAd {
    title: String,
    description: String,
    contact: String,
    technologies: String,
    development_time_months: u32,
    link: String,
    owner: Principal,
    votes_up: u32,
    votes_down: u32,
    created_at: u64,
}

#[derive(CandidType, Deserialize, Clone)]
struct User {
    user_principal: Principal,
    registered_at: u64,
    ads_created: Vec<u64>,
    votes_cast: HashMap<u64, VoteType>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
enum VoteType {
    Up,
    Down,
}

#[derive(CandidType, Deserialize, Clone)]
struct VoteEntry {
    ad_id: u64,
    vote_type: VoteType,
}

#[derive(CandidType, Deserialize)]
struct AddAdResponse {
    success: bool,
    error: Option<String>,
    ad_id: Option<u64>,
}

#[derive(CandidType, Deserialize)]
struct AuthResponse {
    success: bool,
    is_registered: bool,
    user_principal: Principal,
}

#[derive(CandidType, Deserialize)]
struct VoteResponse {
    success: bool,
    error: Option<String>,
    new_votes_up: u32,
    new_votes_down: u32,
}

#[derive(CandidType, Deserialize, Clone)]
struct LogEntry {
    timestamp: u64,
    level: String,
    message: String,
    user_principal: Option<Principal>,
}

thread_local! {
    static PROJECTS: RefCell<HashMap<u64, ProjectAd>> = RefCell::new(HashMap::new());
    static USERS: RefCell<HashMap<Principal, User>> = RefCell::new(HashMap::new());
    static LOGS: RefCell<Vec<LogEntry>> = RefCell::new(Vec::new());
    static NEXT_ID: RefCell<u64> = RefCell::new(1);
}

// Logging functions
fn log_info(message: &str) {
    log_message("INFO", message);
}

fn log_error(message: &str) {
    log_message("ERROR", message);
}

fn log_warn(message: &str) {
    log_message("WARN", message);
}

fn log_message(level: &str, message: &str) {
    let entry = LogEntry {
        timestamp: time(),
        level: level.to_string(),
        message: message.to_string(),
        user_principal: Some(caller()),
    };
    
    LOGS.with(|logs| {
        let mut logs = logs.borrow_mut();
        logs.push(entry);
        // Keep only last 1000 log entries
        if logs.len() > 1000 {
            logs.remove(0);
        }
    });
}

// Authentication and registration
#[update]
fn register_user() -> AuthResponse {
    let principal = caller();
    
    // Anonymous principal cannot register
    if principal == Principal::anonymous() {
        log_error("Anonymous user attempted to register");
        return AuthResponse {
            success: false,
            is_registered: false,
            user_principal: principal,
        };
    }

    USERS.with(|users| {
        let mut users = users.borrow_mut();
        
        if users.contains_key(&principal) {
            log_info(&format!("User {} already registered", principal.to_text()));
            AuthResponse {
                success: true,
                is_registered: true,
                user_principal: principal,
            }
        } else {
            let new_user = User {
                user_principal: principal,
                registered_at: time(),
                ads_created: Vec::new(),
                votes_cast: HashMap::new(),
            };
            users.insert(principal, new_user);
            log_info(&format!("New user registered: {}", principal.to_text()));
            AuthResponse {
                success: true,
                is_registered: true,
                user_principal: principal,
            }
        }
    })
}

#[query]
fn get_auth_status() -> AuthResponse {
    let principal = caller();
    
    if principal == Principal::anonymous() {
        return AuthResponse {
            success: false,
            is_registered: false,
            user_principal: principal,
        };
    }

    USERS.with(|users| {
        let users = users.borrow();
        let is_registered = users.contains_key(&principal);
        
        AuthResponse {
            success: true,
            is_registered,
            user_principal: principal,
        }
    })
}

#[update]
fn add_ad(
    title: String,
    description: String,
    contact: String,
    technologies: String,
    development_time_months: u32,
    link: String,
) -> AddAdResponse {
    let principal = caller();
    
    // Check if user is authenticated
    if principal == Principal::anonymous() {
        log_error("Anonymous user attempted to create ad");
        return AddAdResponse {
            success: false,
            error: Some("You must be authenticated to create an ad.".to_string()),
            ad_id: None,
        };
    }

    // Check if user is registered
    let is_registered = USERS.with(|users| {
        users.borrow().contains_key(&principal)
    });

    if !is_registered {
        log_error(&format!("Unregistered user {} attempted to create ad", principal.to_text()));
        return AddAdResponse {
            success: false,
            error: Some("You must be registered to create an ad.".to_string()),
            ad_id: None,
        };
    }

    // Validation
    if title.len() < 4 {
        log_warn(&format!("User {} failed validation: title too short", principal.to_text()));
        return AddAdResponse {
            success: false,
            error: Some("Title must be at least 4 characters long.".to_string()),
            ad_id: None,
        };
    }
    if description.len() < 16 {
        log_warn(&format!("User {} failed validation: description too short", principal.to_text()));
        return AddAdResponse {
            success: false,
            error: Some("Description must be at least 16 characters long.".to_string()),
            ad_id: None,
        };
    }

    let ad = ProjectAd {
        title: title.clone(),
        description,
        contact,
        technologies,
        development_time_months,
        link,
        owner: principal,
        votes_up: 0,
        votes_down: 0,
        created_at: time(),
    };

    NEXT_ID.with(|id| {
        PROJECTS.with(|projects| {
            USERS.with(|users| {
                let mut projects = projects.borrow_mut();
                let mut users = users.borrow_mut();
                let mut id_mut = id.borrow_mut();
                let current_id = *id_mut;
                
                projects.insert(current_id, ad);
                
                // Update user's ads_created list
                if let Some(user) = users.get_mut(&principal) {
                    user.ads_created.push(current_id);
                }
                
                *id_mut += 1;
                
                log_info(&format!("User {} created ad '{}' with id {}", principal.to_text(), title, current_id));
                
                AddAdResponse {
                    success: true,
                    error: None,
                    ad_id: Some(current_id),
                }
            })
        })
    })
}

// Voting functionality
#[update]
fn vote_ad(ad_id: u64, vote_type: VoteType) -> VoteResponse {
    let principal = caller();
    
    // Check if user is authenticated
    if principal == Principal::anonymous() {
        log_error("Anonymous user attempted to vote");
        return VoteResponse {
            success: false,
            error: Some("You must be authenticated to vote.".to_string()),
            new_votes_up: 0,
            new_votes_down: 0,
        };
    }

    // Check if user is registered
    let is_registered = USERS.with(|users| {
        users.borrow().contains_key(&principal)
    });

    if !is_registered {
        log_error(&format!("Unregistered user {} attempted to vote", principal.to_text()));
        return VoteResponse {
            success: false,
            error: Some("You must be registered to vote.".to_string()),
            new_votes_up: 0,
            new_votes_down: 0,
        };
    }

    PROJECTS.with(|projects| {
        USERS.with(|users| {
            let mut projects = projects.borrow_mut();
            let mut users = users.borrow_mut();
            
            // Check if ad exists
            if !projects.contains_key(&ad_id) {
                log_warn(&format!("User {} attempted to vote on non-existent ad {}", principal.to_text(), ad_id));
                return VoteResponse {
                    success: false,
                    error: Some("Ad not found.".to_string()),
                    new_votes_up: 0,
                    new_votes_down: 0,
                };
            }

            let user = users.get_mut(&principal).unwrap();
            let ad = projects.get_mut(&ad_id).unwrap();

            // Check if user is trying to vote on their own ad
            if ad.owner == principal {
                log_warn(&format!("User {} attempted to vote on their own ad {}", principal.to_text(), ad_id));
                return VoteResponse {
                    success: false,
                    error: Some("You cannot vote on your own ad.".to_string()),
                    new_votes_up: ad.votes_up,
                    new_votes_down: ad.votes_down,
                };
            }

            // Handle previous vote
            if let Some(previous_vote) = user.votes_cast.get(&ad_id) {
                match previous_vote {
                    VoteType::Up => ad.votes_up -= 1,
                    VoteType::Down => ad.votes_down -= 1,
                }
            }

            // Apply new vote
            match vote_type {
                VoteType::Up => ad.votes_up += 1,
                VoteType::Down => ad.votes_down += 1,
            }

            // Update user's vote record
            user.votes_cast.insert(ad_id, vote_type.clone());

            log_info(&format!("User {} voted {:?} on ad {}", principal.to_text(), vote_type, ad_id));

            VoteResponse {
                success: true,
                error: None,
                new_votes_up: ad.votes_up,
                new_votes_down: ad.votes_down,
            }
        })
    })
}

#[update]
fn remove_vote(ad_id: u64) -> VoteResponse {
    let principal = caller();
    
    // Check if user is authenticated
    if principal == Principal::anonymous() {
        return VoteResponse {
            success: false,
            error: Some("You must be authenticated to remove a vote.".to_string()),
            new_votes_up: 0,
            new_votes_down: 0,
        };
    }

    PROJECTS.with(|projects| {
        USERS.with(|users| {
            let mut projects = projects.borrow_mut();
            let mut users = users.borrow_mut();
            
            if !projects.contains_key(&ad_id) {
                return VoteResponse {
                    success: false,
                    error: Some("Ad not found.".to_string()),
                    new_votes_up: 0,
                    new_votes_down: 0,
                };
            }

            let user = users.get_mut(&principal).unwrap();
            let ad = projects.get_mut(&ad_id).unwrap();

            // Check if user has voted on this ad
            if let Some(previous_vote) = user.votes_cast.remove(&ad_id) {
                match previous_vote {
                    VoteType::Up => ad.votes_up -= 1,
                    VoteType::Down => ad.votes_down -= 1,
                }
                
                log_info(&format!("User {} removed vote from ad {}", principal.to_text(), ad_id));
                
                VoteResponse {
                    success: true,
                    error: None,
                    new_votes_up: ad.votes_up,
                    new_votes_down: ad.votes_down,
                }
            } else {
                VoteResponse {
                    success: false,
                    error: Some("You haven't voted on this ad.".to_string()),
                    new_votes_up: ad.votes_up,
                    new_votes_down: ad.votes_down,
                }
            }
        })
    })
}

#[derive(CandidType, Deserialize, Clone)]
struct AdEntry {
    id: u64,
    ad: ProjectAd,
}

#[query]
fn get_ads() -> Vec<AdEntry> {
    PROJECTS.with(|projects| {
        projects.borrow().iter().map(|(id, ad)| AdEntry { id: *id, ad: ad.clone() }).collect()
    })
}

#[update]
fn clear_ads() {
    let principal = caller();
    log_warn(&format!("User {} cleared all ads", principal.to_text()));
    
    PROJECTS.with(|projects| {
        projects.borrow_mut().clear();
    });
    NEXT_ID.with(|id| {
        *id.borrow_mut() = 1;
    });
    
    // Reset user ads_created lists
    USERS.with(|users| {
        let mut users = users.borrow_mut();
        for user in users.values_mut() {
            user.ads_created.clear();
            user.votes_cast.clear();
        }
    });
}

// Query functions for getting user information
#[query]
fn get_user_profile() -> Option<User> {
    let principal = caller();
    
    if principal == Principal::anonymous() {
        return None;
    }

    USERS.with(|users| {
        users.borrow().get(&principal).cloned()
    })
}

#[query]
fn get_user_vote_on_ad(ad_id: u64) -> Option<VoteType> {
    let principal = caller();
    
    if principal == Principal::anonymous() {
        return None;
    }

    USERS.with(|users| {
        if let Some(user) = users.borrow().get(&principal) {
            user.votes_cast.get(&ad_id).cloned()
        } else {
            None
        }
    })
}

// Admin functions for getting logs (only for debugging/monitoring)
#[query]
fn get_logs(limit: Option<u32>) -> Vec<LogEntry> {
    let limit = limit.unwrap_or(100) as usize;
    
    LOGS.with(|logs| {
        let logs = logs.borrow();
        let start = if logs.len() > limit {
            logs.len() - limit
        } else {
            0
        };
        logs[start..].to_vec()
    })
}

#[query]
fn get_stats() -> (u64, u64, u64) {
    let project_count = PROJECTS.with(|projects| projects.borrow().len() as u64);
    let user_count = USERS.with(|users| users.borrow().len() as u64);
    let log_count = LOGS.with(|logs| logs.borrow().len() as u64);
    
    (project_count, user_count, log_count)
}

// Get ads sorted by votes
#[query]
fn get_ads_sorted_by_votes() -> Vec<AdEntry> {
    PROJECTS.with(|projects| {
        let mut ads: Vec<AdEntry> = projects.borrow().iter()
            .map(|(id, ad)| AdEntry { id: *id, ad: ad.clone() })
            .collect();
        
        // Sort by vote score (upvotes - downvotes) in descending order
        ads.sort_by(|a, b| {
            let score_a = a.ad.votes_up as i32 - a.ad.votes_down as i32;
            let score_b = b.ad.votes_up as i32 - b.ad.votes_down as i32;
            score_b.cmp(&score_a)
        });
        
        ads
    })
}

// Get ads by specific user
#[query]
fn get_ads_by_user(user_principal: Principal) -> Vec<AdEntry> {
    PROJECTS.with(|projects| {
        projects.borrow().iter()
            .filter(|(_, ad)| ad.owner == user_principal)
            .map(|(id, ad)| AdEntry { id: *id, ad: ad.clone() })
            .collect()
    })
}
