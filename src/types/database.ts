export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          created_at: string
          district: string
          id: string
          is_default: boolean
          phone: string
          province_city: string
          recipient_name: string
          street_address: string
          user_id: string
          ward: string
        }
        Insert: {
          created_at?: string
          district: string
          id?: string
          is_default?: boolean
          phone: string
          province_city: string
          recipient_name: string
          street_address: string
          user_id: string
          ward: string
        }
        Update: {
          created_at?: string
          district?: string
          id?: string
          is_default?: boolean
          phone?: string
          province_city?: string
          recipient_name?: string
          street_address?: string
          user_id?: string
          ward?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      box_curation_items: {
        Row: {
          box_curation_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          retail_price: number
        }
        Insert: {
          box_curation_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          retail_price: number
        }
        Update: {
          box_curation_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          retail_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "box_curation_items_box_curation_id_fkey"
            columns: ["box_curation_id"]
            isOneToOne: false
            referencedRelation: "box_curations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "box_curation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      box_curations: {
        Row: {
          box_type_id: string
          created_at: string
          curated_at: string | null
          curated_by: string | null
          id: string
          notes: string | null
          order_id: string
          pet_id: string
          status: string
          total_retail_value: number
        }
        Insert: {
          box_type_id: string
          created_at?: string
          curated_at?: string | null
          curated_by?: string | null
          id?: string
          notes?: string | null
          order_id: string
          pet_id: string
          status?: string
          total_retail_value?: number
        }
        Update: {
          box_type_id?: string
          created_at?: string
          curated_at?: string | null
          curated_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          pet_id?: string
          status?: string
          total_retail_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "box_curations_box_type_id_fkey"
            columns: ["box_type_id"]
            isOneToOne: false
            referencedRelation: "box_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "box_curations_curated_by_fkey"
            columns: ["curated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "box_curations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "box_curations_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      box_types: {
        Row: {
          baseprice: number
          created_at: string
          description: string | null
          id: string
          images: string[]
          is_active: boolean
          item_count_max: number
          item_count_min: number
          min_retail_value: number
          name: string
          size: Database["public"]["Enums"]["pet_size"]
          slug: string
          species: Database["public"]["Enums"]["pet_species"]
        }
        Insert: {
          baseprice: number
          created_at?: string
          description?: string | null
          id?: string
          images?: string[]
          is_active?: boolean
          item_count_max: number
          item_count_min: number
          min_retail_value: number
          name: string
          size: Database["public"]["Enums"]["pet_size"]
          slug: string
          species: Database["public"]["Enums"]["pet_species"]
        }
        Update: {
          baseprice?: number
          created_at?: string
          description?: string | null
          id?: string
          images?: string[]
          is_active?: boolean
          item_count_max?: number
          item_count_min?: number
          min_retail_value?: number
          name?: string
          size?: Database["public"]["Enums"]["pet_size"]
          slug?: string
          species?: Database["public"]["Enums"]["pet_species"]
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          box_type_id: string | null
          cart_id: string
          created_at: string
          id: string
          pet_id: string | null
          product_id: string | null
          quantity: number
          updated_at: string
        }
        Insert: {
          box_type_id?: string | null
          cart_id: string
          created_at?: string
          id?: string
          pet_id?: string | null
          product_id?: string | null
          quantity?: number
          updated_at?: string
        }
        Update: {
          box_type_id?: string | null
          cart_id?: string
          created_at?: string
          id?: string
          pet_id?: string | null
          product_id?: string | null
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_box_type_id_fkey"
            columns: ["box_type_id"]
            isOneToOne: false
            referencedRelation: "box_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          id: string
          session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_messages: {
        Row: {
          admin_note: string | null
          created_at: string
          email: string | null
          full_name: string
          handled_at: string | null
          id: string
          message: string
          phone: string
          status: string
          subject: string
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          handled_at?: string | null
          id?: string
          message: string
          phone: string
          status?: string
          subject: string
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          handled_at?: string | null
          id?: string
          message?: string
          phone?: string
          status?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string
          id: string
          movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          new_stock: number
          note: string | null
          performed_by: string | null
          previous_stock: number
          product_id: string
          quantity: number
          reference_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          new_stock: number
          note?: string | null
          performed_by?: string | null
          previous_stock: number
          product_id: string
          quantity: number
          reference_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          movement_type?: Database["public"]["Enums"]["inventory_movement_type"]
          new_stock?: number
          note?: string | null
          performed_by?: string | null
          previous_stock?: number
          product_id?: string
          quantity?: number
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          box_type_id: string | null
          id: string
          order_id: string
          pet_id: string | null
          product_id: string | null
          product_name_snapshot: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          box_type_id?: string | null
          id?: string
          order_id: string
          pet_id?: string | null
          product_id?: string | null
          product_name_snapshot: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          box_type_id?: string | null
          id?: string
          order_id?: string
          pet_id?: string | null
          product_id?: string | null
          product_name_snapshot?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_box_type_id_fkey"
            columns: ["box_type_id"]
            isOneToOne: false
            referencedRelation: "box_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_notes: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          customer_notes: string | null
          cycle_index: number | null
          delivered_at: string | null
          discount_amount: number
          district: string
          id: string
          order_code: string
          order_type: string
          paid_at: string | null
          payment_expires_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          province_city: string
          recipient_name: string
          recipient_phone: string
          renewal_plan_id: string | null
          return_admin_note: string | null
          return_reason: string | null
          return_requested_at: string | null
          return_resolution: string | null
          return_resolved_at: string | null
          shipping_address: string
          shipping_fee: number
          status: Database["public"]["Enums"]["order_status"]
          subscription_id: string | null
          subtotal: number
          total_amount: number
          tracking_code: string | null
          updated_at: string
          user_id: string | null
          voucher_id: string | null
          ward: string
        }
        Insert: {
          admin_notes?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          customer_notes?: string | null
          cycle_index?: number | null
          delivered_at?: string | null
          discount_amount?: number
          district: string
          id?: string
          order_code: string
          order_type: string
          paid_at?: string | null
          payment_expires_at?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          province_city: string
          recipient_name: string
          recipient_phone: string
          renewal_plan_id?: string | null
          return_admin_note?: string | null
          return_reason?: string | null
          return_requested_at?: string | null
          return_resolution?: string | null
          return_resolved_at?: string | null
          shipping_address: string
          shipping_fee?: number
          status?: Database["public"]["Enums"]["order_status"]
          subscription_id?: string | null
          subtotal: number
          total_amount: number
          tracking_code?: string | null
          updated_at?: string
          user_id?: string | null
          voucher_id?: string | null
          ward: string
        }
        Update: {
          admin_notes?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          customer_notes?: string | null
          cycle_index?: number | null
          delivered_at?: string | null
          discount_amount?: number
          district?: string
          id?: string
          order_code?: string
          order_type?: string
          paid_at?: string | null
          payment_expires_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          province_city?: string
          recipient_name?: string
          recipient_phone?: string
          renewal_plan_id?: string | null
          return_admin_note?: string | null
          return_reason?: string | null
          return_requested_at?: string | null
          return_resolution?: string | null
          return_resolved_at?: string | null
          shipping_address?: string
          shipping_fee?: number
          status?: Database["public"]["Enums"]["order_status"]
          subscription_id?: string | null
          subtotal?: number
          total_amount?: number
          tracking_code?: string | null
          updated_at?: string
          user_id?: string | null
          voucher_id?: string | null
          ward?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_renewal_plan_id_fkey"
            columns: ["renewal_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_item_feedback: {
        Row: {
          box_curation_id: string | null
          created_at: string
          id: string
          notes: string | null
          pet_id: string
          product_id: string
          rating: Database["public"]["Enums"]["item_feedback_rating"]
        }
        Insert: {
          box_curation_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          pet_id: string
          product_id: string
          rating: Database["public"]["Enums"]["item_feedback_rating"]
        }
        Update: {
          box_curation_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          pet_id?: string
          product_id?: string
          rating?: Database["public"]["Enums"]["item_feedback_rating"]
        }
        Relationships: [
          {
            foreignKeyName: "pet_item_feedback_box_curation_id_fkey"
            columns: ["box_curation_id"]
            isOneToOne: false
            referencedRelation: "box_curations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_item_feedback_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_item_feedback_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          age_group: Database["public"]["Enums"]["pet_age_group"]
          allergies: string[]
          avatar_url: string | null
          birthdate: string | null
          breed: string | null
          created_at: string
          gender: string | null
          id: string
          name: string
          notes: string | null
          preferences: string[]
          size: Database["public"]["Enums"]["pet_size"]
          species: Database["public"]["Enums"]["pet_species"]
          updated_at: string
          user_id: string
          weight: number | null
        }
        Insert: {
          age_group: Database["public"]["Enums"]["pet_age_group"]
          allergies?: string[]
          avatar_url?: string | null
          birthdate?: string | null
          breed?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          name: string
          notes?: string | null
          preferences?: string[]
          size: Database["public"]["Enums"]["pet_size"]
          species: Database["public"]["Enums"]["pet_species"]
          updated_at?: string
          user_id: string
          weight?: number | null
        }
        Update: {
          age_group?: Database["public"]["Enums"]["pet_age_group"]
          allergies?: string[]
          avatar_url?: string | null
          birthdate?: string | null
          breed?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          name?: string
          notes?: string | null
          preferences?: string[]
          size?: Database["public"]["Enums"]["pet_size"]
          species?: Database["public"]["Enums"]["pet_species"]
          updated_at?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          images: string[]
          ingredients: string[]
          is_active: boolean
          is_box_item: boolean
          is_retail: boolean
          low_stock_threshold: number
          name: string
          original_price: number | null
          price: number
          slug: string
          species: string
          stock_quantity: number
          target_age: string
          target_size: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[]
          ingredients?: string[]
          is_active?: boolean
          is_box_item?: boolean
          is_retail?: boolean
          low_stock_threshold?: number
          name: string
          original_price?: number | null
          price: number
          slug: string
          species?: string
          stock_quantity?: number
          target_age?: string
          target_size?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[]
          ingredients?: string[]
          is_active?: boolean
          is_box_item?: boolean
          is_retail?: boolean
          low_stock_threshold?: number
          name?: string
          original_price?: number | null
          price?: number
          slug?: string
          species?: string
          stock_quantity?: number
          target_age?: string
          target_size?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          admin_reply: string | null
          admin_reply_at: string | null
          comment: string | null
          created_at: string
          id: string
          images: string[]
          is_rewarded: boolean
          order_id: string
          rating: number
          status: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          admin_reply_at?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          images?: string[]
          is_rewarded?: boolean
          order_id: string
          rating: number
          status?: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          admin_reply_at?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          images?: string[]
          is_rewarded?: boolean
          order_id?: string
          rating?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          badge: string | null
          birthday_gift: boolean
          cycle_count: number
          description: string | null
          discount_percentage: number
          free_shipping: boolean
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          badge?: string | null
          birthday_gift?: boolean
          cycle_count: number
          description?: string | null
          discount_percentage: number
          free_shipping?: boolean
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          badge?: string | null
          birthday_gift?: boolean
          cycle_count?: number
          description?: string | null
          discount_percentage?: number
          free_shipping?: boolean
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          box_type_id: string
          cancellation_reason: string | null
          created_at: string
          current_cycle: number
          cutoff_date: string
          delivery_schedule: Database["public"]["Enums"]["delivery_schedule"]
          grace_period_expires_at: string | null
          id: string
          next_delivery_date: string
          paused_cycles_left: number
          pet_id: string
          plan_id: string
          remaining_cycles: number
          shipping_address_id: string | null
          shipping_address_snapshot: Json
          status: Database["public"]["Enums"]["subscription_status"]
          subscription_code: string
          total_cycles: number
          total_prepaid_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          box_type_id: string
          cancellation_reason?: string | null
          created_at?: string
          current_cycle?: number
          cutoff_date: string
          delivery_schedule: Database["public"]["Enums"]["delivery_schedule"]
          grace_period_expires_at?: string | null
          id?: string
          next_delivery_date: string
          paused_cycles_left?: number
          pet_id: string
          plan_id: string
          remaining_cycles: number
          shipping_address_id?: string | null
          shipping_address_snapshot: Json
          status?: Database["public"]["Enums"]["subscription_status"]
          subscription_code: string
          total_cycles: number
          total_prepaid_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          box_type_id?: string
          cancellation_reason?: string | null
          created_at?: string
          current_cycle?: number
          cutoff_date?: string
          delivery_schedule?: Database["public"]["Enums"]["delivery_schedule"]
          grace_period_expires_at?: string | null
          id?: string
          next_delivery_date?: string
          paused_cycles_left?: number
          pet_id?: string
          plan_id?: string
          remaining_cycles?: number
          shipping_address_id?: string | null
          shipping_address_snapshot?: Json
          status?: Database["public"]["Enums"]["subscription_status"]
          subscription_code?: string
          total_cycles?: number
          total_prepaid_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_box_type_id_fkey"
            columns: ["box_type_id"]
            isOneToOne: false
            referencedRelation: "box_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      voucher_usages: {
        Row: {
          created_at: string
          discount_amount: number
          id: string
          order_id: string
          user_id: string | null
          voucher_id: string
        }
        Insert: {
          created_at?: string
          discount_amount: number
          id?: string
          order_id: string
          user_id?: string | null
          voucher_id: string
        }
        Update: {
          created_at?: string
          discount_amount?: number
          id?: string
          order_id?: string
          user_id?: string | null
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_usages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_usages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_usages_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          code: string
          created_at: string
          discount_value: number
          id: string
          is_active: boolean
          max_discount: number | null
          min_order_value: number
          scope: string
          usage_limit_per_user: number
          usage_limit_total: number
          used_count: number
          valid_from: string
          valid_to: string
          voucher_type: Database["public"]["Enums"]["voucher_discount_type"]
        }
        Insert: {
          code: string
          created_at?: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order_value?: number
          scope?: string
          usage_limit_per_user?: number
          usage_limit_total?: number
          used_count?: number
          valid_from: string
          valid_to: string
          voucher_type: Database["public"]["Enums"]["voucher_discount_type"]
        }
        Update: {
          code?: string
          created_at?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order_value?: number
          scope?: string
          usage_limit_per_user?: number
          usage_limit_total?: number
          used_count?: number
          valid_from?: string
          valid_to?: string
          voucher_type?: Database["public"]["Enums"]["voucher_discount_type"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _assert_pet_fits_box: {
        Args: { p_box_type_id: string; p_pet_id: string }
        Returns: undefined
      }
      _deduct_retail_stock: { Args: { p_order_id: string }; Returns: undefined }
      approve_box_curation: {
        Args: { p_curation_id: string; p_product_ids: string[] }
        Returns: Json
      }
      calc_shipping_fee: {
        Args: {
          p_free_shipping?: boolean
          p_province: string
          p_subtotal: number
        }
        Returns: number
      }
      cancel_expired_orders: { Args: never; Returns: number }
      cancel_order_by_staff: {
        Args: { p_order_id: string; p_reason: string }
        Returns: Json
      }
      cancel_subscription: {
        Args: { p_reason: string; p_subscription_id: string }
        Returns: Json
      }
      check_subscription_grace_periods: { Args: never; Returns: number }
      checkout_create_order: {
        Args: {
          p_customer_notes?: string
          p_district: string
          p_items: Json
          p_payment_method: Database["public"]["Enums"]["payment_method"]
          p_province_city: string
          p_recipient_name: string
          p_recipient_phone: string
          p_shipping_address: string
          p_voucher_code?: string
          p_ward: string
        }
        Returns: Json
      }
      confirm_cod_order: { Args: { p_order_id: string }; Returns: Json }
      confirm_order_payment: {
        Args: { p_order_code: string; p_order_id: string }
        Returns: Json
      }
      generate_subscription_cycle_orders: { Args: never; Returns: number }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      lookup_order: {
        Args: { p_order_code: string; p_phone: string }
        Returns: {
          created_at: string
          discount_amount: number
          district: string
          id: string
          order_code: string
          order_type: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          province_city: string
          recipient_name: string
          recipient_phone: string
          shipping_address: string
          shipping_fee: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total_amount: number
          tracking_code: string
          ward: string
        }[]
      }
      mark_order_delivered: { Args: { p_order_id: string }; Returns: Json }
      mark_order_shipping: {
        Args: {
          p_carrier?: string
          p_order_id: string
          p_tracking_code: string
        }
        Returns: Json
      }
      pause_subscription: {
        Args: { p_cycles: number; p_subscription_id: string }
        Returns: Json
      }
      renew_subscription: {
        Args: {
          p_payment_method: Database["public"]["Enums"]["payment_method"]
          p_plan_id: string
          p_subscription_id: string
        }
        Returns: Json
      }
      request_order_return: {
        Args: { p_order_id: string; p_reason: string }
        Returns: Json
      }
      resume_subscription: {
        Args: { p_subscription_id: string }
        Returns: Json
      }
      send_subscription_reminders: { Args: never; Returns: number }
      subscribe_to_box: {
        Args: {
          p_box_type_id: string
          p_delivery_schedule: Database["public"]["Enums"]["delivery_schedule"]
          p_district: string
          p_payment_method: Database["public"]["Enums"]["payment_method"]
          p_pet_id: string
          p_plan_id: string
          p_province_city: string
          p_recipient_name: string
          p_recipient_phone: string
          p_shipping_address: string
          p_ward: string
        }
        Returns: Json
      }
      next_delivery_window: {
        Args: {
          p_from: string
          p_schedule: Database["public"]["Enums"]["delivery_schedule"]
        }
        Returns: string
      }
      resolve_order_return: {
        Args: { p_note: string; p_order_id: string; p_resolution: string }
        Returns: Json
      }
      submit_feedback: {
        Args: {
          p_email: string
          p_full_name: string
          p_message: string
          p_phone: string
          p_subject: string
        }
        Returns: string
      }
      update_my_subscription_delivery: {
        Args: {
          p_address?: Json
          p_delivery_schedule?: Database["public"]["Enums"]["delivery_schedule"]
          p_subscription_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      delivery_schedule: "dau_thang" | "giua_thang"
      inventory_movement_type:
        | "import"
        | "retail_sale"
        | "box_curation"
        | "adjustment"
        | "return_restock"
      item_feedback_rating: "like" | "neutral" | "dislike"
      order_status:
        | "cho_thanh_toan"
        | "da_xac_nhan"
        | "dang_chuan_bi"
        | "dang_giao"
        | "da_giao"
        | "da_huy"
        | "doi_tra"
      payment_method: "momo" | "vnpay" | "cod"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      pet_age_group: "puppy_kitten" | "adult" | "senior"
      pet_size: "small" | "large"
      pet_species: "dog" | "cat"
      subscription_status:
        | "cho_thanh_toan"
        | "dang_hoat_dong"
        | "tam_dung"
        | "qua_han"
        | "het_han"
        | "da_huy"
      user_role: "customer" | "admin"
      voucher_discount_type: "percentage" | "fixed_amount" | "free_shipping"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      delivery_schedule: ["dau_thang", "giua_thang"],
      inventory_movement_type: [
        "import",
        "retail_sale",
        "box_curation",
        "adjustment",
        "return_restock",
      ],
      item_feedback_rating: ["like", "neutral", "dislike"],
      order_status: [
        "cho_thanh_toan",
        "da_xac_nhan",
        "dang_chuan_bi",
        "dang_giao",
        "da_giao",
        "da_huy",
        "doi_tra",
      ],
      payment_method: ["momo", "vnpay", "cod"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      pet_age_group: ["puppy_kitten", "adult", "senior"],
      pet_size: ["small", "large"],
      pet_species: ["dog", "cat"],
      subscription_status: [
        "cho_thanh_toan",
        "dang_hoat_dong",
        "tam_dung",
        "qua_han",
        "het_han",
        "da_huy",
      ],
      user_role: ["customer", "admin"],
      voucher_discount_type: ["percentage", "fixed_amount", "free_shipping"],
    },
  },
} as const
