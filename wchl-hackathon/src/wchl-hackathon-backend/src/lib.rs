use candid::Principal;
use ic_cdk::api::caller;
use ic_cdk_macros::*;
use candid::{CandidType, Deserialize};
use std::cell::RefCell;
use std::collections::HashMap;

#[derive(CandidType, Deserialize, Clone)]
struct ProjectAd {
    title: String,
    description: String,
    contact: String,
    technologies: String,
    development_time_months: u32,
    link: String,              // nowe pole link
    owner: Principal,
}

#[derive(CandidType, Deserialize)]
struct AddAdResponse {
    success: bool,
    error: Option<String>,
}


thread_local! {
    static PROJECTS: RefCell<HashMap<u64, ProjectAd>> = RefCell::new(HashMap::new());
    static NEXT_ID: RefCell<u64> = RefCell::new(1);
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
    // Walidacja
    if title.len() < 4 {
        return AddAdResponse {
            success: false,
            error: Some("Title must be at least 4 characters long.".to_string()),
        };
    }
    if description.len() < 16 {
        return AddAdResponse {
            success: false,
            error: Some("Description must be at least 16 characters long.".to_string()),
        };
    }

    let caller = caller();
    let ad = ProjectAd {
        title,
        description,
        contact,
        technologies,
        development_time_months,
        link,
        owner: caller,
    };

    NEXT_ID.with(|id| {
        PROJECTS.with(|projects| {
            let mut projects = projects.borrow_mut();
            let mut id_mut = id.borrow_mut();
            let current_id = *id_mut;
            projects.insert(current_id, ad);
            *id_mut += 1;
            // Sukces, zwracamy true i brak błędu
            AddAdResponse {
                success: true,
                error: None,
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
    PROJECTS.with(|projects| {
        projects.borrow_mut().clear();
    });
    NEXT_ID.with(|id| {
        *id.borrow_mut() = 1;
    });
}
