"use server";

import { supabase } from "@/lib/database";

export async function getContinentsAction() {
    const { data, error } = await supabase.from('dim_continent').select('id, name').order('name');
    if (error) throw new Error(error.message);
    return data || [];
}

export async function getCountriesAction(continentId?: string) {
    let query = supabase.from('dim_country').select('id, name, currency_code, continent_id').order('name');
    if (continentId) query = query.eq('continent_id', continentId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
}

export async function getCitiesAction(countryId?: string) {
    let query = supabase.from('dim_city').select('id, name, country_id').order('name');
    if (countryId) query = query.eq('country_id', countryId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
}
