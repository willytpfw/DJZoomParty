import { pgTable, serial, varchar, boolean, integer, timestamp, doublePrecision, text, char } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// User table
export const user = pgTable('user', {
    idUser: serial('id_user').primaryKey(),
    eMail: varchar('email', { length: 50 }),
    movil: varchar('movil', { length: 10 }),
    userName: varchar('user_name', { length: 25 }).unique().notNull(),
    administrator: boolean('administrator').default(false),
    active: boolean('active').default(true),
    password: varchar('password', { length: 16 }),
});

// Company table
export const company = pgTable('company', {
    idCompany: serial('id_company').primaryKey(),
    name: varchar('name', { length: 50 }).notNull(),
    createDate: timestamp('create_date', { withTimezone: true }).defaultNow(),
    active: boolean('active').default(true),
    url: varchar('url', { length: 500 }),
    urlImagen: varchar('url_imagen', { length: 500 }),
    keyCompany: varchar('key_company', { length: 8 }).unique().notNull(),
    urlInstagram: varchar('url_instagram', { length: 500 }),
    urlFacebook: varchar('url_facebook', { length: 500 }),
    webPage: varchar('web_page', { length: 500 }),
    validityDate: timestamp('validity_date', { withTimezone: true }),
});

// UserCompany junction table
export const userCompany = pgTable('user_company', {
    idUserCompany: serial('id_user_company').primaryKey(),
    idUser: integer('id_user').references(() => user.idUser).notNull(),
    idCompany: integer('id_company').references(() => company.idCompany).notNull(),
});

// Event table
export const event = pgTable('event', {
    idEvent: serial('id_event').primaryKey(),
    idCompany: integer('id_company').references(() => company.idCompany).notNull(),
    name: varchar('name', { length: 50 }).notNull(),
    creationDate: timestamp('creation_date', { withTimezone: true }).defaultNow(),
    eventDate: timestamp('event_date', { withTimezone: true }).notNull(),
    active: boolean('active').default(true),
    eventToken: varchar('event_token', { length: 16 }).unique().notNull(),
    positionLongitud: doublePrecision('position_longitud'),
    positionLatitud: doublePrecision('position_latitud'),
    playList: boolean('play_list').default(false),
    youtubePlaylistId: varchar('youtube_playlist_id', { length: 255 }),
});

// EventMusic table
export const eventMusic = pgTable('event_music', {
    idEventMusic: serial('id_event_music').primaryKey(),
    idEvent: integer('id_event').references(() => event.idEvent).notNull(),
    number: integer('number').notNull(),
    url: varchar('url', { length: 255 }).notNull(),
    title: varchar('title', { length: 100 }).notNull(),
    likes: integer('likes').default(0),
    visible: boolean('visible').default(true),
});

// UserLogin table
export const userLogin = pgTable('user_login', {
    idUserLogin: serial('id_user_login').primaryKey(),
    idUser: integer('id_user').references(() => user.idUser).notNull(),
    date: timestamp('date', { withTimezone: true }).defaultNow(),
    pin: varchar('pin', { length: 8 }).notNull(),
    ip: varchar('ip', { length: 45 }),
    response: varchar('response', { length: 10 }),
});

// AppRequest table — stores app registration requests
export const appRequest = pgTable('app_request', {
    idAppRequest: serial('id_app_request').primaryKey(),
    companyName: varchar('company_name', { length: 100 }).notNull(),
    userName: varchar('user_name', { length: 25 }).notNull(),
    eMail: varchar('email', { length: 50 }).notNull(),
    movil: varchar('movil', { length: 10 }),
    ip: varchar('ip', { length: 45 }),
    requestDate: timestamp('request_date', { withTimezone: true }).defaultNow(),
    key: char('key', { length: 10 }).notNull(),
    active: boolean('active').default(false),
    pin: varchar('pin', { length: 8 }),
});

// Error table
export const error = pgTable('error', {
    idError: serial('id_error').primaryKey(),
    idUserLogin: integer('id_user_login').references(() => userLogin.idUserLogin),
    date: timestamp('date', { withTimezone: true }).defaultNow(),
    error: text('error'),
    stack: text('stack'),
});

// Relations
export const userRelations = relations(user, ({ many }) => ({
    userCompanies: many(userCompany),
    userLogins: many(userLogin),
}));

export const companyRelations = relations(company, ({ many }) => ({
    userCompanies: many(userCompany),
    events: many(event),
}));

export const userCompanyRelations = relations(userCompany, ({ one }) => ({
    user: one(user, {
        fields: [userCompany.idUser],
        references: [user.idUser],
    }),
    company: one(company, {
        fields: [userCompany.idCompany],
        references: [company.idCompany],
    }),
}));

export const eventRelations = relations(event, ({ one, many }) => ({
    company: one(company, {
        fields: [event.idCompany],
        references: [company.idCompany],
    }),
    eventMusics: many(eventMusic),
}));

export const eventMusicRelations = relations(eventMusic, ({ one }) => ({
    event: one(event, {
        fields: [eventMusic.idEvent],
        references: [event.idEvent],
    }),
}));

export const userLoginRelations = relations(userLogin, ({ one, many }) => ({
    user: one(user, {
        fields: [userLogin.idUser],
        references: [user.idUser],
    }),
    errors: many(error),
}));

export const errorRelations = relations(error, ({ one }) => ({
    userLogin: one(userLogin, {
        fields: [error.idUserLogin],
        references: [userLogin.idUserLogin],
    }),
}));

// Type exports
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Company = typeof company.$inferSelect;
export type NewCompany = typeof company.$inferInsert;
export type Event = typeof event.$inferSelect;
export type NewEvent = typeof event.$inferInsert;
export type EventMusic = typeof eventMusic.$inferSelect;
export type NewEventMusic = typeof eventMusic.$inferInsert;
export type UserLogin = typeof userLogin.$inferSelect;
export type NewUserLogin = typeof userLogin.$inferInsert;
export type Error = typeof error.$inferSelect;
export type NewError = typeof error.$inferInsert;
export type AppRequest = typeof appRequest.$inferSelect;
export type NewAppRequest = typeof appRequest.$inferInsert;
