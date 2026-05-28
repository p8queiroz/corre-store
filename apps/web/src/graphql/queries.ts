import { gql } from "@apollo/client";

export const HOMEPAGE_QUERY = gql`
  query Homepage {
    homepageBanners {
      id
      title
      subtitle
      imageUrl
      linkUrl
    }
    categories {
      id
      slug
      name
      icon
    }
    featuredListings(limit: 8) {
      id
      title
      slug
      priceCents
      city
      state
      images {
        url
        thumbnailUrl
      }
      category {
        name
      }
    }
    trendingListings(limit: 12) {
      id
      title
      slug
      priceCents
      city
      state
      images {
        url
        thumbnailUrl
      }
    }
  }
`;

export const CATEGORIES_QUERY = gql`
  query Categories {
    categories {
      id
      slug
      name
    }
  }
`;

export const SEARCH_LISTINGS_QUERY = gql`
  query SearchListings(
    $q: String
    $categorySlug: String
    $sort: String
    $page: Int
    $limit: Int
  ) {
    searchListings(
      q: $q
      categorySlug: $categorySlug
      sort: $sort
      page: $page
      limit: $limit
    ) {
      items {
        id
        title
        slug
        priceCents
        city
        state
        condition
        images {
          url
          thumbnailUrl
        }
        category {
          name
        }
      }
      total
      page
      limit
    }
  }
`;

export const LISTING_DETAIL_QUERY = gql`
  query ListingDetail($slug: String!) {
    listing(slug: $slug) {
      id
      title
      slug
      description
      priceCents
      condition
      city
      state
      tags
      viewCount
      publishedAt
      images {
        url
        thumbnailUrl
        altText
      }
      category {
        name
        slug
      }
      seller {
        id
        name
        avatarUrl
      }
    }
  }
`;
