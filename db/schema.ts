import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), username: text('username').notNull().unique(), email: text('email').notNull().unique(), password: text('password').notNull(), preferences: text('preferences').notNull().default('[]'),
});
export const sessions = sqliteTable('sessions', {
  token: text('token').primaryKey(), userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), expires: integer('expires').notNull(),
}, t => [index('idx_sessions_user').on(t.userId)]);
export const books = sqliteTable('books', {
  id: text('id').primaryKey(), title: text('title').notNull().unique(), author: text('author').notNull(), description: text('description').notNull(), thumbnail: text('thumbnail').notNull(), genre: text('genre').notNull(),
});
export const library = sqliteTable('library', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), bookId: text('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }), isRead: integer('is_read').notNull().default(0),
}, t => [primaryKey({ columns: [t.userId, t.bookId] })]);
export const ratings = sqliteTable('ratings', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), bookId: text('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }), value: integer('value').notNull(),
}, t => [primaryKey({ columns: [t.userId, t.bookId] }), index('idx_ratings_book').on(t.bookId)]);
export const rejections = sqliteTable('rejections', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), title: text('title').notNull(),
}, t => [primaryKey({ columns: [t.userId, t.title] })]);
