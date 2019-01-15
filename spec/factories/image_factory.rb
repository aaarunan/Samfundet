# frozen_string_literal: true

include ActionDispatch::TestProcess

FactoryGirl.define do
  factory :image do
    title 'Tittel'
    image_file do
      fixture_file_upload Rails.root.join('app', 'assets', 'images', 'banner-images', 'kitteh.jpeg', 'image/png')
    end
  end
end
