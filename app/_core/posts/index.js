export class SocialPostsService {
    constructor() {
        this.posts = [];
    }
    
    // Add a new post
    addPost(post) {
        this.posts.push(post);
    }
    
    // Get all posts
    getPosts() {
        return this.posts;
    }
    
    // Get posts by user ID
    getPostsByUserId(userId) {
        return this.posts.filter(post => post.userId === userId);
    }
    
    // Delete a post by ID
    deletePost(postId) {
        this.posts = this.posts.filter(post => post.id !== postId);
    }

}
