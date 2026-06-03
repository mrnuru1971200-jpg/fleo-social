# Security Specification for fleo social

## Data Invariants
1. **Identity Integrity**: Users can only create or edit profiles where the document ID matches their authenticated `request.auth.uid`. They cannot modify other users' profiles.
2. **Post Ownership**: Users can only create and delete posts where `authorId` strictly matches `request.auth.uid`. No user can delete another user's post.
3. **Likes & Relational Sync**: A like document can only be written by the authenticated user itself. Decrementing or incrementing a count requires proper client operation or transaction.
4. **No Shadow Updates**: Only fields that are explicitly whitelisted are permitted to update across transactions. Immutable fields like `createdAt` cannot be edited.
5. **PII Protection**: Email configuration can only be read by the owner of the user document.

## The "Dirty Dozen" Malicious Payloads Checked by rules

1. **Payload 1: Identity Spoofing (Create User Profile as Another User)**
   - Target Path: `/users/hacked_id`
   - Content: `{ "uid": "another_id", "email": "evil@attacker.com", "username": "scammer", "displayName": "Attacker", "createdAt": request.time, "updatedAt": request.time }`
   - Expected Result: `PERMISSION_DENIED` - document ID `hacked_id` must match `request.auth.uid`.

2. **Payload 2: Role Escalation (Setting admin flag)**
   - Target Path: `/users/{userId}`
   - Content: `{ ..., "role": "admin" }` or `{ ..., "isAdmin": true }`
   - Expected Result: `PERMISSION_DENIED` - no administrative fields allowed in profile.

3. **Payload 3: Read PII of Another User (Get Private Info)**
   - Target Path: `/users/victim_user_id` when authenticated as `attacker_uid`
   - Expected Result: `PERMISSION_DENIED` for fields containing PII if we decide to restrict, but in our case, reading a public profile is allowed. However, modifying `email` or writing to it is strictly protected.

4. **Payload 4: Post Author Impersonation (Create Feed Post with Victim's ID)**
   - Target Path: `/posts/some_post`
   - Content: `{ "id": "some_post", "authorId": "victim_uid", "authorName": "Victim", "content": "Fake post!", ... }`
   - Expected Result: `PERMISSION_DENIED` - `authorId` must match authenticated user's ID.

5. **Payload 5: Malicious Ghost Fields (Create Post with Admin Overrides)**
   - Target Path: `/posts/some_post`
   - Content: `{ ..., "likesCount": 9999, "ghostAttribute": "evil" }`
   - Expected Result: `PERMISSION_DENIED` - schema verification failed.

6. **Payload 6: Modifying Someone Else's Post**
   - Target Path: `/posts/victim_post`
   - Content: `{ ..., "content": "Defaced content by hacker" }` for a post owned by `victim_uid`
   - Expected Result: `PERMISSION_DENIED` - can only update your own posts.

7. **Payload 7: Unsigned/Anonymous Writes**
   - Target Path: `/posts/new_post`
   - Content: Trying to write a post without `request.auth`
   - Expected Result: `PERMISSION_DENIED` - user must be signed in.

8. **Payload 8: Double Liking / Double Decrementing (Liking as Another User)**
   - Target Path: `/posts/some_post/likes/victim_id` when auth is `attacker_uid`
   - Content: `{ "userId": "victim_id", "createdAt": request.time }`
   - Expected Result: `PERMISSION_DENIED` - can only create likes where ID is your own UID.

9. **Payload 9: Editing Immortal Fields (Altering `createdAt` timestamp of a post)**
   - Target Path: `/posts/my_post`
   - Content: `{ ..., "createdAt": 0 }` (modifying original timestamp)
   - Expected Result: `PERMISSION_DENIED` - `createdAt` must remain immutable.

10. **Payload 10: Value/Size Poisoning (Injecting huge bio)**
    - Target Path: `/users/my_id`
    - Content: `{ ..., "bio": "A" * 10000 }` (bio larger than limit)
    - Expected Result: `PERMISSION_DENIED` - validation helper blocks size.

11. **Payload 11: Write Unverified Notification to Another User's Inbox**
    - Target Path: `/users/victim_uid/notifications/notif_id`
    - Content: `{ "id": "notif_id", "type": "spam", "senderId": "attacker_uid", ... }`
    - Expected Result: `PERMISSION_DENIED` or strictly regulated so users can only receive notifications for like/comment events on posts.

12. **Payload 12: Blank Reads on Subcollections**
    - Target Path: `/posts/some_post/likes` without specific limit or filters
    - Expected Result: `PERMISSION_DENIED` unless properly scoped.
