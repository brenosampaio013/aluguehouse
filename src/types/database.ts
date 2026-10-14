export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      amenities: {
        Row: {
          id: string;
          label: string;
          slug: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          label: string;
          slug: string;
        };
        Update: {
          id?: string;
          label?: string;
          slug?: string;
        };
        Relationships: [];
      };
      booking_requests: {
        Row: {
          admin_notes: string | null;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          guest_email: string;
          guest_name: string;
          guest_phone: string;
          guests_count: number;
          id: string;
          message: string | null;
          privacy_consent_at: string;
          property_id: string;
          quote_snapshot: NonNullable<Json>;
          quoted_total: number;
          rental_mode: Database["public"]["Enums"]["rental_mode"];
          status: Database["public"]["Enums"]["booking_status"];
          stay: unknown;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          admin_notes?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          guest_email: string;
          guest_name: string;
          guest_phone: string;
          guests_count: number;
          id?: string;
          message?: string | null;
          privacy_consent_at: string;
          property_id: string;
          quote_snapshot: NonNullable<Json>;
          quoted_total: number;
          rental_mode: Database["public"]["Enums"]["rental_mode"];
          status?: Database["public"]["Enums"]["booking_status"];
          stay: unknown;
          updated_at?: string;
        };
        Update: {
          admin_notes?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          guest_email?: string;
          guest_name?: string;
          guest_phone?: string;
          guests_count?: number;
          id?: string;
          message?: string | null;
          privacy_consent_at?: string;
          property_id?: string;
          quote_snapshot?: NonNullable<Json>;
          quoted_total?: number;
          rental_mode?: Database["public"]["Enums"]["rental_mode"];
          status?: Database["public"]["Enums"]["booking_status"];
          stay?: unknown;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_requests_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      calendar_blocks: {
        Row: {
          booking_request_id: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          kind: Database["public"]["Enums"]["block_kind"];
          note: string | null;
          property_id: string;
          stay: unknown;
        };
        ComputedFields: never;
        Insert: {
          booking_request_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind: Database["public"]["Enums"]["block_kind"];
          note?: string | null;
          property_id: string;
          stay: unknown;
        };
        Update: {
          booking_request_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["block_kind"];
          note?: string | null;
          property_id?: string;
          stay?: unknown;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_blocks_booking_request_id_fkey";
            columns: ["booking_request_id"];
            isOneToOne: true;
            referencedRelation: "booking_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calendar_blocks_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      favorites: {
        Row: {
          created_at: string;
          property_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          property_id: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          property_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorites_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      inquiries: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          kind: Database["public"]["Enums"]["inquiry_kind"];
          message: string;
          name: string;
          phone: string | null;
          preferred_datetime: string | null;
          privacy_consent_at: string;
          property_id: string | null;
          status: Database["public"]["Enums"]["inquiry_status"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          kind: Database["public"]["Enums"]["inquiry_kind"];
          message: string;
          name: string;
          phone?: string | null;
          preferred_datetime?: string | null;
          privacy_consent_at: string;
          property_id?: string | null;
          status?: Database["public"]["Enums"]["inquiry_status"];
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["inquiry_kind"];
          message?: string;
          name?: string;
          phone?: string | null;
          preferred_datetime?: string | null;
          privacy_consent_at?: string;
          property_id?: string | null;
          status?: Database["public"]["Enums"]["inquiry_status"];
        };
        Relationships: [
          {
            foreignKeyName: "inquiries_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          id: string;
          phone: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          approx_lat: number | null;
          approx_lng: number | null;
          area_m2: number | null;
          bathrooms: number;
          bedrooms: number;
          check_in_time: string;
          check_out_time: string;
          city: string;
          condo_fee: number | null;
          created_at: string;
          description: string | null;
          distance_to_beach_m: number | null;
          house_rules: string | null;
          id: string;
          iptu_yearly: number | null;
          max_guests: number;
          max_nights: number;
          min_nights: number;
          monthly_price: number | null;
          neighborhood: string | null;
          nightly_price: number | null;
          offers_monthly: boolean;
          offers_sale: boolean;
          offers_seasonal: boolean;
          parking_spots: number;
          property_type: Database["public"]["Enums"]["property_type"];
          published_at: string | null;
          region: string | null;
          sale_price: number | null;
          slug: string;
          status: Database["public"]["Enums"]["property_status"];
          suites: number;
          summary: string | null;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          approx_lat?: number | null;
          approx_lng?: number | null;
          area_m2?: number | null;
          bathrooms?: number;
          bedrooms?: number;
          check_in_time?: string;
          check_out_time?: string;
          city: string;
          condo_fee?: number | null;
          created_at?: string;
          description?: string | null;
          distance_to_beach_m?: number | null;
          house_rules?: string | null;
          id?: string;
          iptu_yearly?: number | null;
          max_guests?: number;
          max_nights?: number;
          min_nights?: number;
          monthly_price?: number | null;
          neighborhood?: string | null;
          nightly_price?: number | null;
          offers_monthly?: boolean;
          offers_sale?: boolean;
          offers_seasonal?: boolean;
          parking_spots?: number;
          property_type: Database["public"]["Enums"]["property_type"];
          published_at?: string | null;
          region?: string | null;
          sale_price?: number | null;
          slug: string;
          status?: Database["public"]["Enums"]["property_status"];
          suites?: number;
          summary?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          approx_lat?: number | null;
          approx_lng?: number | null;
          area_m2?: number | null;
          bathrooms?: number;
          bedrooms?: number;
          check_in_time?: string;
          check_out_time?: string;
          city?: string;
          condo_fee?: number | null;
          created_at?: string;
          description?: string | null;
          distance_to_beach_m?: number | null;
          house_rules?: string | null;
          id?: string;
          iptu_yearly?: number | null;
          max_guests?: number;
          max_nights?: number;
          min_nights?: number;
          monthly_price?: number | null;
          neighborhood?: string | null;
          nightly_price?: number | null;
          offers_monthly?: boolean;
          offers_sale?: boolean;
          offers_seasonal?: boolean;
          parking_spots?: number;
          property_type?: Database["public"]["Enums"]["property_type"];
          published_at?: string | null;
          region?: string | null;
          sale_price?: number | null;
          slug?: string;
          status?: Database["public"]["Enums"]["property_status"];
          suites?: number;
          summary?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      property_amenities: {
        Row: {
          amenity_id: string;
          property_id: string;
        };
        ComputedFields: never;
        Insert: {
          amenity_id: string;
          property_id: string;
        };
        Update: {
          amenity_id?: string;
          property_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "property_amenities_amenity_id_fkey";
            columns: ["amenity_id"];
            isOneToOne: false;
            referencedRelation: "amenities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "property_amenities_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      property_fees: {
        Row: {
          amount: number;
          applies_to: Database["public"]["Enums"]["fee_applies_to"];
          calc: Database["public"]["Enums"]["fee_calc"];
          created_at: string;
          id: string;
          is_refundable: boolean;
          label: string;
          position: number;
          property_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          applies_to?: Database["public"]["Enums"]["fee_applies_to"];
          calc: Database["public"]["Enums"]["fee_calc"];
          created_at?: string;
          id?: string;
          is_refundable?: boolean;
          label: string;
          position?: number;
          property_id: string;
        };
        Update: {
          amount?: number;
          applies_to?: Database["public"]["Enums"]["fee_applies_to"];
          calc?: Database["public"]["Enums"]["fee_calc"];
          created_at?: string;
          id?: string;
          is_refundable?: boolean;
          label?: string;
          position?: number;
          property_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "property_fees_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      property_media: {
        Row: {
          alt_text: string;
          created_at: string;
          external_url: string | null;
          height: number | null;
          id: string;
          is_cover: boolean;
          is_demo: boolean;
          kind: Database["public"]["Enums"]["media_kind"];
          position: number;
          property_id: string;
          storage_path: string | null;
          width: number | null;
        };
        ComputedFields: never;
        Insert: {
          alt_text: string;
          created_at?: string;
          external_url?: string | null;
          height?: number | null;
          id?: string;
          is_cover?: boolean;
          is_demo?: boolean;
          kind: Database["public"]["Enums"]["media_kind"];
          position?: number;
          property_id: string;
          storage_path?: string | null;
          width?: number | null;
        };
        Update: {
          alt_text?: string;
          created_at?: string;
          external_url?: string | null;
          height?: number | null;
          id?: string;
          is_cover?: boolean;
          is_demo?: boolean;
          kind?: Database["public"]["Enums"]["media_kind"];
          position?: number;
          property_id?: string;
          storage_path?: string | null;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "property_media_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      property_private: {
        Row: {
          exact_lat: number | null;
          exact_lng: number | null;
          full_address: string | null;
          owner_notes: string | null;
          property_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          exact_lat?: number | null;
          exact_lng?: number | null;
          full_address?: string | null;
          owner_notes?: string | null;
          property_id: string;
          updated_at?: string;
        };
        Update: {
          exact_lat?: number | null;
          exact_lng?: number | null;
          full_address?: string | null;
          owner_notes?: string | null;
          property_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "property_private_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: true;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          admin_reply: string | null;
          author_display_name: string;
          author_id: string;
          booking_request_id: string;
          comment: string | null;
          created_at: string;
          id: string;
          moderated_at: string | null;
          property_id: string;
          rating: number;
          status: Database["public"]["Enums"]["review_status"];
        };
        ComputedFields: never;
        Insert: {
          admin_reply?: string | null;
          author_display_name?: string;
          author_id?: string;
          booking_request_id: string;
          comment?: string | null;
          created_at?: string;
          id?: string;
          moderated_at?: string | null;
          property_id: string;
          rating: number;
          status?: Database["public"]["Enums"]["review_status"];
        };
        Update: {
          admin_reply?: string | null;
          author_display_name?: string;
          author_id?: string;
          booking_request_id?: string;
          comment?: string | null;
          created_at?: string;
          id?: string;
          moderated_at?: string | null;
          property_id?: string;
          rating?: number;
          status?: Database["public"]["Enums"]["review_status"];
        };
        Relationships: [
          {
            foreignKeyName: "reviews_booking_request_id_fkey";
            columns: ["booking_request_id"];
            isOneToOne: true;
            referencedRelation: "booking_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      seasonal_rates: {
        Row: {
          created_at: string;
          id: string;
          label: string;
          min_nights: number | null;
          nightly_price: number;
          period: unknown;
          property_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          label: string;
          min_nights?: number | null;
          nightly_price: number;
          period: unknown;
          property_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          label?: string;
          min_nights?: number | null;
          nightly_price?: number;
          period?: unknown;
          property_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seasonal_rates_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      approve_booking_request: { Args: { p_id: string }; Returns: undefined };
      cancel_booking_request: { Args: { p_id: string; p_notes?: string }; Returns: undefined };
      decline_booking_request: { Args: { p_id: string; p_notes?: string }; Returns: undefined };
      get_my_stays: {
        Args: Record<PropertyKey, never>;
        Returns: {
          booking_request_id: string;
          can_review: boolean;
          check_in: string;
          check_out: string;
          has_review: boolean;
          property_id: string;
          property_slug: string;
          property_title: string;
          status: Database["public"]["Enums"]["booking_status"];
        }[];
      };
      get_unavailable_ranges: {
        Args: { p_from: string; p_property_id: string; p_to: string };
        Returns: {
          end_date: string;
          start_date: string;
        }[];
      };
      hit_rate_limit: {
        Args: { p_bucket: string; p_max: number; p_window_seconds: number };
        Returns: boolean;
      };
      quote_stay: {
        Args: {
          p_check_in: string;
          p_check_out: string;
          p_guests: number;
          p_mode: Database["public"]["Enums"]["rental_mode"];
          p_property_id: string;
        };
        Returns: Json;
      };
      request_booking: {
        Args: {
          p_check_in: string;
          p_check_out: string;
          p_email: string;
          p_guests: number;
          p_message: string;
          p_mode: Database["public"]["Enums"]["rental_mode"];
          p_name: string;
          p_phone: string;
          p_privacy_consent: boolean;
          p_property_id: string;
        };
        Returns: string;
      };
      search_rentals: {
        Args: {
          p_amenities?: string[];
          p_bedrooms?: number;
          p_check_in?: string;
          p_check_out?: string;
          p_guests?: number;
          p_limit?: number;
          p_mode: Database["public"]["Enums"]["rental_mode"];
          p_offset?: number;
          p_price_max?: number;
          p_region?: string;
          p_sort?: string;
        };
        Returns: {
          base_price: number;
          bedrooms: number;
          city: string;
          id: string;
          max_guests: number;
          neighborhood: string;
          nights: number;
          quote_total: number;
          region: string;
          slug: string;
          suites: number;
          title: string;
          total_count: number;
        }[];
      };
      search_sales: {
        Args: {
          p_amenities?: string[];
          p_area_min?: number;
          p_bedrooms?: number;
          p_limit?: number;
          p_offset?: number;
          p_price_max?: number;
          p_region?: string;
          p_sort?: string;
          p_type?: Database["public"]["Enums"]["property_type"];
        };
        Returns: {
          area_m2: number;
          bedrooms: number;
          city: string;
          id: string;
          neighborhood: string;
          property_type: Database["public"]["Enums"]["property_type"];
          region: string;
          sale_price: number;
          slug: string;
          suites: number;
          title: string;
          total_count: number;
        }[];
      };
    };
    Enums: {
      block_kind: "booking" | "owner" | "maintenance";
      booking_status: "pending" | "approved" | "declined" | "cancelled" | "expired";
      fee_applies_to: "seasonal" | "monthly" | "both";
      fee_calc: "fixed" | "per_night" | "per_guest_per_night" | "percent";
      inquiry_kind: "contact" | "visit" | "sale_interest";
      inquiry_status: "new" | "in_progress" | "closed";
      media_kind: "image" | "video" | "tour";
      property_status: "draft" | "published" | "archived";
      property_type: "casa" | "apartamento" | "cobertura" | "terreno" | "outro";
      rental_mode: "seasonal" | "monthly";
      review_status: "pending" | "approved" | "rejected";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      block_kind: ["booking", "owner", "maintenance"],
      booking_status: ["pending", "approved", "declined", "cancelled", "expired"],
      fee_applies_to: ["seasonal", "monthly", "both"],
      fee_calc: ["fixed", "per_night", "per_guest_per_night", "percent"],
      inquiry_kind: ["contact", "visit", "sale_interest"],
      inquiry_status: ["new", "in_progress", "closed"],
      media_kind: ["image", "video", "tour"],
      property_status: ["draft", "published", "archived"],
      property_type: ["casa", "apartamento", "cobertura", "terreno", "outro"],
      rental_mode: ["seasonal", "monthly"],
      review_status: ["pending", "approved", "rejected"],
    },
  },
} as const;
