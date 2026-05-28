/**
 * GraphQL schema — public marketplace reads + authenticated seller mutations.
 * Frontend uses Apollo Client (see apps/web).
 */
export const typeDefs = /* GraphQL */ `
  scalar DateTime

  enum ListingCondition {
    NEW
    LIKE_NEW
    GOOD
    FAIR
    FOR_PARTS
  }

  type Category {
    id: ID!
    slug: String!
    name: String!
    description: String
    icon: String
  }

  type ListingImage {
    id: ID!
    url: String!
    thumbnailUrl: String
    altText: String
  }

  type SellerSummary {
    id: ID!
    name: String!
    avatarUrl: String
  }

  type Listing {
    id: ID!
    title: String!
    slug: String!
    description: String!
    priceCents: Int!
    condition: ListingCondition!
    city: String!
    state: String!
    tags: [String!]!
    viewCount: Int!
    favoriteCount: Int!
    featured: Boolean!
    publishedAt: DateTime
    category: Category!
    images: [ListingImage!]!
    seller: SellerSummary!
  }

  type ListingConnection {
    items: [Listing!]!
    total: Int!
    page: Int!
    limit: Int!
  }

  type HomepageBanner {
    id: ID!
    title: String!
    subtitle: String
    imageUrl: String!
    linkUrl: String
  }

  type Query {
    health: String!
    categories: [Category!]!
    listing(slug: String!): Listing
    searchListings(
      q: String
      categorySlug: String
      city: String
      state: String
      condition: ListingCondition
      minPriceCents: Int
      maxPriceCents: Int
      sort: String
      page: Int
      limit: Int
    ): ListingConnection!
    featuredListings(limit: Int): [Listing!]!
    trendingListings(limit: Int): [Listing!]!
    homepageBanners: [HomepageBanner!]!
  }
`;
