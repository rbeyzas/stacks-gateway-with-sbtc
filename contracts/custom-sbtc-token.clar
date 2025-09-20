;; Custom sBTC-like Token Contract
;; SIP-010 compliant fungible token

;; Import SIP-010 trait
(impl-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

;; Constants
(define-constant CONTRACT-OWNER tx-sender)
(define-constant TOKEN-NAME "CustomSBTC")
(define-constant TOKEN-SYMBOL "CSBTC")
(define-constant TOKEN-DECIMALS u8)
(define-constant TOKEN-SUPPLY u2100000000000000) ;; 21M tokens with 8 decimals

;; Error constants
(define-constant ERR_UNAUTHORIZED (err u401))
(define-constant ERR_INVALID_AMOUNT (err u400))
(define-constant ERR_INSUFFICIENT_BALANCE (err u402))
(define-constant ERR_INSUFFICIENT_ALLOWANCE (err u403))
(define-constant ERR_NONCE_ERROR (err u404))

;; Data variables
(define-data-var last-token-id uint u0)
(define-data-var name (string-ascii 32) TOKEN-NAME)
(define-data-var symbol (string-ascii 32) TOKEN-SYMBOL)
(define-data-var decimals uint TOKEN-DECIMALS)
(define-data-var total-supply uint TOKEN-SUPPLY)

;; Data maps
(define-map balances
  { owner: principal }
  { balance: uint }
)

(define-map allowances
  { owner: principal, spender: principal }
  { amount: uint }
)

(define-map nonces
  { owner: principal }
  { nonce: uint }
)

;; Public functions

;; Get token name
(define-read-only (get-name)
  (ok (var-get name))
)

;; Get token symbol  
(define-read-only (get-symbol)
  (ok (var-get symbol))
)

;; Get token decimals
(define-read-only (get-decimals)
  (ok (var-get decimals))
)

;; Get total supply
(define-read-only (get-total-supply)
  (ok (var-get total-supply))
)

;; Get token URI
(define-read-only (get-token-uri)
  (ok (some "https://stacksgate.com/csbtc-metadata.json"))
)

;; Get balance of principal
(define-read-only (get-balance (owner principal))
  (ok (default-to u0 (get balance (map-get? balances { owner: owner }))))
)

;; Get allowance
(define-read-only (get-allowance (owner principal) (spender principal))
  (ok (default-to u0 (get amount (map-get? allowances { owner: owner, spender: spender }))))
)

;; Transfer tokens
(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (let (
    (sender-balance (get balance (map-get? balances { owner: sender })))
    (current-balance (default-to u0 sender-balance))
  )
    (asserts! (is-eq tx-sender sender) ERR_UNAUTHORIZED)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (>= current-balance amount) ERR_INSUFFICIENT_BALANCE)
    
    ;; Update sender balance
    (map-set balances
      { owner: sender }
      { balance: (- current-balance amount) }
    )
    
    ;; Update recipient balance
    (map-set balances
      { owner: recipient }
      { balance: (+ (default-to u0 (get balance (map-get? balances { owner: recipient }))) amount) }
    )
    
    (ok true)
  )
)

;; Mint new tokens (only contract owner)
(define-public (mint (amount uint) (recipient principal))
  (let (
    (current-supply (var-get total-supply))
    (new-supply (+ current-supply amount))
  )
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR_UNAUTHORIZED)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    
    ;; Update total supply
    (var-set total-supply new-supply)
    
    ;; Update recipient balance
    (map-set balances
      { owner: recipient }
      { balance: (+ (default-to u0 (get balance (map-get? balances { owner: recipient }))) amount) }
    )
    
    (ok true)
  )
)

;; Burn tokens
(define-public (burn (amount uint))
  (let (
    (sender-balance (get balance (map-get? balances { owner: tx-sender })))
    (current-balance (default-to u0 sender-balance))
    (current-supply (var-get total-supply))
    (new-supply (- current-supply amount))
  )
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (>= current-balance amount) ERR_INSUFFICIENT_BALANCE)
    
    ;; Update total supply
    (var-set total-supply new-supply)
    
    ;; Update sender balance
    (map-set balances
      { owner: tx-sender }
      { balance: (- current-balance amount) }
    )
    
    (ok true)
  )
)

;; Initialize contract (mint initial supply to owner)
(define-public (initialize)
  (let (
    (initial-supply (var-get total-supply))
  )
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR_UNAUTHORIZED)
    
    ;; Mint initial supply to contract owner
    (map-set balances
      { owner: CONTRACT-OWNER }
      { balance: initial-supply }
    )
    
    (ok true)
  )
)
